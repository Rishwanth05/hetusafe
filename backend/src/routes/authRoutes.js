const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const xss = require('xss');
const pool = require('../db');
const { generateOTP, sendOTPEmail, sendResetEmail } = require('../utils/email');
const { verifyToken } = require('../middleware/auth');
const redis = require('../config/redis');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const validate = require('../middleware/validate');

const router = express.Router();

// Reused field schemas
const emailField = z.string().trim().email('Invalid email address');
const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: emailField,
  password: passwordField,
});
const verifyEmailSchema = z.object({
  email: emailField,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});
const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});
const verifyLoginSchema = z.object({
  email: emailField,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});
const resendOtpSchema = z.object({
  email: emailField,
  purpose: z.enum(['verify', 'login']),
});
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: passwordField,
});
const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: passwordField,
});
const emergencyContactItemSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(100, 'Name must be 100 characters or less'),
  phone: z.string().min(1, 'Phone number is required').max(30, 'Phone number too long'),
  relation: z.string().max(100, 'Relation must be 100 characters or less').optional(),
  id: z.number().or(z.string()).optional(),
});
const emergencyContactsSchema = z.object({
  contacts: z.array(emergencyContactItemSchema).max(10, 'Maximum 10 emergency contacts allowed'),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: { message: 'Too many OTP requests. Try again in 30 minutes.' },
});

// ── Helper: issue token pair ───────────────────────────────────────────────────
async function issueTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, refreshToken, expiresAt]
  );
  return { accessToken, refreshToken };
}

// ── SIGNUP (step 1) ────────────────────────────────────────────────────────────
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const clean_name = xss(name);

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(409).json({ message: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, is_verified, role)
       VALUES ($1, $2, $3, false, 'user')
       ON CONFLICT (email) DO NOTHING`,
      [clean_name, email, password_hash]
    );

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at)
       VALUES ($1, $2, 'verify', $3)
       ON CONFLICT (email, purpose) DO UPDATE
       SET code = $2, expires_at = $3, attempts = 0`,
      [email, otp, expires_at]
    );

    await sendOTPEmail(email, otp, 'verify');
    res.json({ message: 'OTP sent to your email', email });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// ── VERIFY EMAIL OTP ───────────────────────────────────────────────────────────
router.post('/verify-email', validate(verifyEmailSchema), async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await pool.query(
      `SELECT * FROM otp_codes WHERE email = $1 AND purpose = 'verify'`,
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'No OTP found. Request a new one.' });

    const record = result.rows[0];

    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });

    if (record.attempts >= 5)
      return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' });

    if (record.code !== otp) {
      const updated = await pool.query(
        `UPDATE otp_codes SET attempts = attempts + 1
         WHERE email = $1 AND purpose = 'verify'
         RETURNING attempts`,
        [email]
      );
      const attemptsLeft = 5 - updated.rows[0].attempts;
      if (attemptsLeft <= 0) {
        await pool.query(`DELETE FROM otp_codes WHERE email = $1 AND purpose = 'verify'`, [email]);
        return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' });
      }
      return res.status(400).json({
        message: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      });
    }

    await pool.query(
      `UPDATE users SET is_verified = true, failed_login_attempts = 0, locked_until = NULL WHERE email = $1`,
      [email]
    );
    await pool.query(`DELETE FROM otp_codes WHERE email = $1 AND purpose = 'verify'`, [email]);

    const user = await pool.query(
      `SELECT id, name, email, role, created_at, is_verified, trust_score, badge_tier
       FROM users WHERE email = $1`,
      [email]
    );

    const { accessToken, refreshToken } = await issueTokens(user.rows[0]);

    res.json({ message: 'Email verified ✅', accessToken, refreshToken, user: user.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── LOGIN (step 1) ─────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = result.rows[0];

    if (!user.is_verified)
      return res.status(403).json({ message: 'Please verify your email first', needsVerification: true, email });

    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `Account locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      const updated = await pool.query(
        `UPDATE users SET failed_login_attempts = failed_login_attempts + 1
         WHERE email = $1 RETURNING failed_login_attempts`,
        [email]
      );
      const attempts = updated.rows[0].failed_login_attempts;

      if (attempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await pool.query(`UPDATE users SET locked_until = $1 WHERE email = $2`, [lockedUntil, email]);
        try { await sendOTPEmail(email, null, 'lockout') } catch (_) {}
        return res.status(423).json({
          message: 'Account locked for 30 minutes due to too many failed attempts. Check your email.',
        });
      }

      const attemptsLeft = 5 - attempts;
      return res.status(401).json({
        message: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} before lockout.`,
      });
    }

    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1`,
      [email]
    );

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at)
       VALUES ($1, $2, 'login', $3)
       ON CONFLICT (email, purpose) DO UPDATE
       SET code = $2, expires_at = $3, attempts = 0`,
      [email, otp, expires_at]
    );

    await sendOTPEmail(email, otp, 'login');
    res.json({ message: 'OTP sent to your email', email });
  } catch (err) {
    next(err);
  }
});

// ── VERIFY LOGIN OTP ───────────────────────────────────────────────────────────
router.post('/verify-login', validate(verifyLoginSchema), async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await pool.query(
      `SELECT * FROM otp_codes WHERE email = $1 AND purpose = 'login'`,
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'No OTP found. Login again.' });

    const record = result.rows[0];

    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ message: 'OTP expired. Login again.' });

    if (record.attempts >= 5)
      return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' });

    if (record.code !== otp) {
      const updated = await pool.query(
        `UPDATE otp_codes SET attempts = attempts + 1
         WHERE email = $1 AND purpose = 'login'
         RETURNING attempts`,
        [email]
      );
      const attemptsLeft = 5 - updated.rows[0].attempts;
      if (attemptsLeft <= 0) {
        await pool.query(`DELETE FROM otp_codes WHERE email = $1 AND purpose = 'login'`, [email]);
        return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' });
      }
      return res.status(400).json({
        message: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      });
    }

    await pool.query(`DELETE FROM otp_codes WHERE email = $1 AND purpose = 'login'`, [email]);

    const user = await pool.query(
      `SELECT id, name, email, role, created_at, is_verified, trust_score, badge_tier
       FROM users WHERE email = $1`,
      [email]
    );

    const { accessToken, refreshToken } = await issueTokens(user.rows[0]);

    res.json({ message: 'Login successful ✅', accessToken, refreshToken, user: user.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── REFRESH TOKEN ──────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ message: 'Refresh token required' });

    // Atomically consume the token. Concurrent requests race to this DELETE;
    // only one gets a row back — the second sees zero rows and gets 401.
    const { rows: tokenRows } = await pool.query(
      `DELETE FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() RETURNING user_id`,
      [refreshToken]
    );

    if (tokenRows.length === 0)
      return res.status(401).json({ message: 'Invalid or expired refresh token' });

    const userResult = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [tokenRows[0].user_id]
    );
    const user = userResult.rows[0];
    if (!user)
      return res.status(401).json({ message: 'Invalid or expired refresh token' });

    // Rotate: insert new token pair
    const newRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, newRefreshToken, expiresAt]
    );

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

// ── LOGOUT ─────────────────────────────────────────────────────────────────────
router.post('/logout', verifyToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.headers.authorization.split(' ')[1];

    await redis.set(`blacklist:${accessToken}`, 1, 'EX', 900);

    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Logged out ✅' });
  } catch (err) {
    next(err);
  }
});

// ── RESEND OTP ─────────────────────────────────────────────────────────────────
router.post('/resend-otp', otpLimiter, validate(resendOtpSchema), async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email, purpose) DO UPDATE
       SET code = $2, expires_at = $4, attempts = 0`,
      [email, otp, purpose, expires_at]
    );

    await sendOTPEmail(email, otp, purpose);
    res.json({ message: 'OTP resent ✅' });
  } catch (err) {
    next(err);
  }
});

// ── SAVE FCM TOKEN ─────────────────────────────────────────────────────────────
router.post('/fcm-token', verifyToken, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'token is required' });
    await pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [token, req.user.id]);
    res.json({ message: 'FCM token saved ✅' });
  } catch (err) {
    next(err);
  }
});

// ── GET MY PROFILE ─────────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at, is_verified, trust_score, badge_tier
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── GET MY REPORTS ─────────────────────────────────────────────────────────────
router.get('/my-reports', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ── UPDATE NAME ────────────────────────────────────────────────────────────────
router.put('/update-name', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: 'Name is required' });

    const clean_name = xss(name.trim());

    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role',
      [clean_name, req.user.id]
    );
    res.json({ message: 'Name updated ✅', user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── CHANGE PASSWORD ────────────────────────────────────────────────────────────
router.put('/change-password', verifyToken, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { old_password, new_password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    const match = await bcrypt.compare(old_password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.user.id]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Password changed ✅' });
  } catch (err) {
    next(err);
  }
});

// ── REQUEST ACCOUNT DELETION OTP ───────────────────────────────────────────────
router.post('/request-delete', verifyToken, async (req, res, next) => {
  try {
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = user.rows[0].email;

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at)
       VALUES ($1, $2, 'delete', $3)
       ON CONFLICT (email, purpose) DO UPDATE
       SET code = $2, expires_at = $3, attempts = 0`,
      [email, otp, expires_at]
    );

    await sendOTPEmail(email, otp, 'delete');
    res.json({ message: 'Deletion OTP sent to your email' });
  } catch (err) {
    next(err);
  }
});

// ── CONFIRM ACCOUNT DELETION ───────────────────────────────────────────────────
router.delete('/delete-account', verifyToken, async (req, res, next) => {
  try {
    const { otp, reason, comments } = req.body;
    if (!otp) return res.status(400).json({ message: 'OTP required' });

    const user = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = user.rows[0].email;

    const record = await pool.query(
      `SELECT * FROM otp_codes WHERE email = $1 AND purpose = 'delete'`,
      [email]
    );

    if (record.rows.length === 0)
      return res.status(400).json({ message: 'No deletion OTP found. Request one first.' });

    const otpRow = record.rows[0];

    if (new Date() > new Date(otpRow.expires_at))
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });

    if (otpRow.attempts >= 5)
      return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' });

    if (otpRow.code !== otp) {
      const updated = await pool.query(
        `UPDATE otp_codes SET attempts = attempts + 1
         WHERE email = $1 AND purpose = 'delete'
         RETURNING attempts`,
        [email]
      );
      const attemptsLeft = 5 - updated.rows[0].attempts;
      if (attemptsLeft <= 0) {
        await pool.query(`DELETE FROM otp_codes WHERE email = $1 AND purpose = 'delete'`, [email]);
        return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' });
      }
      return res.status(400).json({
        message: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      });
    }

    let dbClient
    try {
      dbClient = await pool.connect()
      await dbClient.query('BEGIN')

      await dbClient.query(`UPDATE reports SET user_id = NULL WHERE user_id = $1`, [req.user.id])

      if (reason) {
        await dbClient.query(
          `INSERT INTO account_deletions (email, reason, comments, deleted_at) VALUES ($1, $2, $3, NOW())`,
          [email, reason, comments || null]
        )
      }

      await dbClient.query(`DELETE FROM otp_codes WHERE email = $1`, [email])
      await dbClient.query(`DELETE FROM users WHERE id = $1`, [req.user.id])

      await dbClient.query('COMMIT')
    } catch (txErr) {
      if (dbClient) await dbClient.query('ROLLBACK').catch(() => {})
      throw txErr
    } finally {
      if (dbClient) dbClient.release()
    }

    res.json({ message: 'Account permanently deleted.' })
  } catch (err) {
    next(err);
  }
});

// ── FORGOT PASSWORD ────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(`UPDATE password_reset_tokens SET used = true WHERE email = $1`, [email]);
    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)`,
      [email, token, expires_at]
    );

    const primaryOrigin = (process.env.FRONTEND_URL || '').split(',')[0].trim();
    const resetLink = `${primaryOrigin}/reset-password?token=${token}`;
    await sendResetEmail(email, resetLink);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ── RESET PASSWORD ─────────────────────────────────────────────────────────────
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    const result = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false`,
      [token]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'Invalid or expired reset link.' });

    const record = result.rows[0];

    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ message: 'Reset link has expired. Request a new one.' });

    const user = await pool.query('SELECT id FROM users WHERE email = $1', [record.email]);
    if (user.rows.length === 0)
      return res.status(400).json({ message: 'User not found.' });

    const userId = user.rows[0].id;

    const history = await pool.query(
      `SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    for (const row of history.rows) {
      const reused = await bcrypt.compare(new_password, row.password_hash);
      if (reused)
        return res.status(400).json({ message: 'You cannot reuse one of your last 5 passwords.' });
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);
    await pool.query('INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)', [userId, password_hash]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);
    await pool.query('DELETE FROM otp_codes WHERE email = $1', [record.email]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    next(err);
  }
});

// GET /auth/emergency-contacts — fetch user's emergency contacts
router.get('/emergency-contacts', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT emergency_contacts FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]?.emergency_contacts || []);
  } catch (err) {
    next(err);
  }
});

// PUT /auth/emergency-contacts — save user's emergency contacts
router.put('/emergency-contacts', verifyToken, validate(emergencyContactsSchema), async (req, res, next) => {
  try {
    const { contacts } = req.body;
    await pool.query(
      'UPDATE users SET emergency_contacts = $1 WHERE id = $2',
      [JSON.stringify(contacts), req.user.id]
    );
    res.json({ message: 'Emergency contacts saved', contacts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
