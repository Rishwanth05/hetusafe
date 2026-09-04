'use strict';

const request = require('supertest');
const app = require('../app');
const pool = require('../db');
const redis = require('../config/redis');

// Prevent any real emails from being sent
jest.mock('../utils/email', () => ({
  generateOTP: jest.requireActual('../utils/email').generateOTP,
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const USER = {
  name: 'Test User',
  email: 'authtest@example.com',
  password: 'ValidPass1!',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Supertest agent that keeps cookies alive across requests (needed for CSRF)
let agent;
let csrfToken;

async function getOtp(email, purpose) {
  const { rows } = await pool.query(
    'SELECT code FROM otp_codes WHERE email = $1 AND purpose = $2',
    [email, purpose]
  );
  return rows[0]?.code;
}

async function signupUser(overrides = {}) {
  return agent
    .post('/api/v1/auth/signup')
    .set('X-CSRF-Token', csrfToken)
    .send({ ...USER, ...overrides });
}

async function verifyEmail(email = USER.email) {
  const otp = await getOtp(email, 'verify');
  return agent
    .post('/api/v1/auth/verify-email')
    .set('X-CSRF-Token', csrfToken)
    .send({ email, otp });
}

/** Creates a verified user and returns the tokens from verify-email. */
async function createVerifiedUser(overrides = {}) {
  await signupUser(overrides);
  const email = overrides.email ?? USER.email;
  return verifyEmail(email);
}

/** Performs both login steps; returns { accessToken, refreshToken, user }. */
async function loginUser(email = USER.email, password = USER.password) {
  await agent
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', csrfToken)
    .send({ email, password });

  const otp = await getOtp(email, 'login');
  const res = await agent
    .post('/api/v1/auth/verify-login')
    .set('X-CSRF-Token', csrfToken)
    .send({ email, otp });
  return res.body;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  agent = request.agent(app);
  // Fetch CSRF token once; the cookie is stored in the agent for all requests
  const res = await agent.get('/api/csrf-token');
  csrfToken = res.body.csrfToken;
  expect(csrfToken).toBeTruthy();
});

beforeEach(async () => {
  // Flush Redis DB 1 so rate-limit counters don't bleed between tests
  await redis.flushdb();
  // Wipe auth-related tables so each test starts clean
  await pool.query(
    `TRUNCATE users, otp_codes, refresh_tokens,
     password_reset_tokens, password_history, account_deletions
     RESTART IDENTITY CASCADE`
  );
});

afterAll(async () => {
  await pool.end();
  // disconnect() is immediate — avoids the ioredis QUIT round-trip hanging Jest
  redis.disconnect();
});

// ── Signup ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/signup', () => {
  test('valid data returns 200 and sends OTP', async () => {
    const res = await signupUser();
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/OTP sent/i);
    expect(res.body.email).toBe(USER.email);
  });

  test('duplicate email returns 409', async () => {
    await signupUser();
    const res = await signupUser();
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  test('missing name returns 400', async () => {
    const res = await signupUser({ name: '' });
    expect(res.status).toBe(400);
  });

  test('password shorter than 8 chars returns 400', async () => {
    const res = await signupUser({ password: 'Abc1!' });
    expect(res.status).toBe(400);
  });

  test('password without a number returns 400', async () => {
    const res = await signupUser({ password: 'NoNumbers!' });
    expect(res.status).toBe(400);
  });

  test('invalid email format returns 400', async () => {
    const res = await signupUser({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

// ── Email Verification ────────────────────────────────────────────────────────

describe('POST /api/v1/auth/verify-email', () => {
  test('correct OTP verifies account and returns tokens', async () => {
    await signupUser();
    const res = await verifyEmail();

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.email).toBe(USER.email);
    expect(res.body.user.is_verified).toBe(true);
  });

  test('wrong OTP returns 400 with attempts-remaining message', async () => {
    await signupUser();
    const res = await agent
      .post('/api/v1/auth/verify-email')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect otp/i);
  });

  test('no OTP on record returns 400', async () => {
    const res = await agent
      .post('/api/v1/auth/verify-email')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'nobody@example.com', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no otp found/i);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  test('valid credentials return 200 and send OTP', async () => {
    await createVerifiedUser();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, password: USER.password });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/OTP sent/i);
  });

  test('wrong password returns 401', async () => {
    await createVerifiedUser();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('unverified account returns 403 with needsVerification flag', async () => {
    await signupUser(); // sign up but do NOT verify
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, password: USER.password });

    expect(res.status).toBe(403);
    expect(res.body.needsVerification).toBe(true);
  });

  test('non-existent email returns 401', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'ghost@example.com', password: USER.password });

    expect(res.status).toBe(401);
  });
});

// ── Login OTP Verification ────────────────────────────────────────────────────

describe('POST /api/v1/auth/verify-login', () => {
  test('correct OTP returns tokens and user', async () => {
    await createVerifiedUser();
    const body = await loginUser();

    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe(USER.email);
  });

  test('wrong OTP returns 400', async () => {
    await createVerifiedUser();
    await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, password: USER.password });

    const res = await agent
      .post('/api/v1/auth/verify-login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect otp/i);
  });

  test('no pending OTP returns 400', async () => {
    const res = await agent
      .post('/api/v1/auth/verify-login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no otp found/i);
  });
});

// ── Token Refresh ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  test('valid refresh token issues a new token pair', async () => {
    await createVerifiedUser();
    const { refreshToken } = await loginUser();

    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    // Old refresh token should now be invalid (rotation)
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  test('used refresh token returns 401', async () => {
    await createVerifiedUser();
    const { refreshToken } = await loginUser();

    // Consume the token
    await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    // Try to reuse it
    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });

  test('missing refresh token returns 401', async () => {
    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(401);
  });

  test('returns 401 (not 500) when user account was deleted after token was issued', async () => {
    const { body: { user } } = await createVerifiedUser();

    // Capture the refresh token before the user is deleted
    const { rows: [{ token: refreshToken }] } = await pool.query(
      'SELECT token FROM refresh_tokens WHERE user_id = $1',
      [user.id]
    );

    // Simulate an out-of-band deletion (e.g. admin action). ON DELETE CASCADE
    // on refresh_tokens removes the token row too — so the 401 comes from the
    // token-not-found guard, not the user-not-found guard. Both return 401;
    // this test verifies no crash occurs in either case.
    await pool.query('DELETE FROM users WHERE id = $1', [user.id]);

    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});

// ── Protected Routes ──────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  test('valid Bearer token returns user profile', async () => {
    await createVerifiedUser();
    const { accessToken } = await loginUser();

    const res = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(USER.email);
    expect(res.body.password_hash).toBeUndefined();
  });

  test('missing token returns 401', async () => {
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('malformed token returns 401', async () => {
    const res = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  test('logout with valid token returns 200', async () => {
    await createVerifiedUser();
    const { accessToken, refreshToken } = await loginUser();

    const res = await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });

  test('blacklisted token cannot access /me', async () => {
    await createVerifiedUser();
    const { accessToken, refreshToken } = await loginUser();

    await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    const res = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(401);
  });
});

// ── Forgot / Reset Password ───────────────────────────────────────────────────

describe('POST /api/v1/auth/forgot-password', () => {
  test('known email returns the generic success message', async () => {
    await createVerifiedUser();
    const res = await agent
      .post('/api/v1/auth/forgot-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  test('unknown email also returns 200 (no user enumeration)', async () => {
    const res = await agent
      .post('/api/v1/auth/forgot-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email exists/i);
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  test('valid token resets password', async () => {
    await createVerifiedUser();
    await agent
      .post('/api/v1/auth/forgot-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email });

    // Read the reset token directly from the DB
    const { rows } = await pool.query(
      'SELECT token FROM password_reset_tokens WHERE email = $1 AND used = false',
      [USER.email]
    );
    const resetToken = rows[0].token;

    const res = await agent
      .post('/api/v1/auth/reset-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ token: resetToken, new_password: 'NewValidPass2!' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password reset successful/i);
  });

  test('invalid token returns 400', async () => {
    const res = await agent
      .post('/api/v1/auth/reset-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ token: 'fake-token', new_password: 'NewValidPass2!' });

    expect(res.status).toBe(400);
  });
});

// ── Account Deletion ──────────────────────────────────────────────────────────

describe('DELETE /api/v1/auth/delete-account', () => {
  // Restore any spies created within these tests without touching the
  // top-level jest.mock('../utils/email', …), which is a module mock and
  // is unaffected by restoreAllMocks().
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('valid OTP deletes user row, anonymises reports, clears OTP codes', async () => {
    // Use the accessToken returned directly by verify-email to avoid going
    // through POST /auth/login, which has an in-memory rate limiter that
    // accumulates across the full test suite and would be exhausted by this point.
    const { body: { accessToken, user } } = await createVerifiedUser();
    const userId = user.id;

    // Insert a report owned by this user so we can assert anonymisation.
    const { rows: [report] } = await pool.query(
      `INSERT INTO reports
         (user_id, hazard_type, severity, description, latitude, longitude, location_method)
       VALUES ($1, 'Pothole', 'low', 'Test hazard', 37.0, -122.0, 'gps')
       RETURNING id`,
      [userId]
    );
    const reportId = report.id;

    // Request the deletion OTP (sendOTPEmail is mocked; code lands in DB).
    await agent
      .post('/api/v1/auth/request-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken);

    const otp = await getOtp(USER.email, 'delete');
    expect(otp).toBeTruthy();

    const res = await agent
      .delete('/api/v1/auth/delete-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ otp });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/permanently deleted/i);

    // User row must be gone.
    const { rows: users } = await pool.query(
      'SELECT id FROM users WHERE id = $1', [userId]
    );
    expect(users).toHaveLength(0);

    // Report must have user_id anonymised to NULL.
    const { rows: reports } = await pool.query(
      'SELECT user_id FROM reports WHERE id = $1', [reportId]
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].user_id).toBeNull();

    // OTP codes for this email must all be cleared.
    const { rows: otps } = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1', [USER.email]
    );
    expect(otps).toHaveLength(0);
  });

  test('wrong OTP returns 400, increments attempts counter, leaves account intact', async () => {
    const { body: { accessToken, user } } = await createVerifiedUser();
    const userId = user.id;

    await agent
      .post('/api/v1/auth/request-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken);

    const res = await agent
      .delete('/api/v1/auth/delete-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect otp/i);

    // User row must still exist.
    const { rows: users } = await pool.query(
      'SELECT id FROM users WHERE id = $1', [userId]
    );
    expect(users).toHaveLength(1);

    // Attempts counter must have been incremented to 1.
    const { rows: otps } = await pool.query(
      'SELECT attempts FROM otp_codes WHERE email = $1 AND purpose = $2',
      [USER.email, 'delete']
    );
    expect(otps[0].attempts).toBe(1);
  });
});

// ── Session revocation on password change ─────────────────────────────────────

describe('PUT /api/v1/auth/change-password', () => {
  test('old refresh token is rejected after a successful password change', async () => {
    const { body: { accessToken, refreshToken } } = await createVerifiedUser();

    const changeRes = await agent
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ old_password: USER.password, new_password: 'NewValidPass2!' });
    expect(changeRes.status).toBe(200);

    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/reset-password (session revocation)', () => {
  test('old refresh token is rejected after a successful password reset', async () => {
    const { body: { refreshToken } } = await createVerifiedUser();

    await agent
      .post('/api/v1/auth/forgot-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email });

    const { rows } = await pool.query(
      'SELECT token FROM password_reset_tokens WHERE email = $1 AND used = false',
      [USER.email]
    );
    const resetToken = rows[0].token;

    const resetRes = await agent
      .post('/api/v1/auth/reset-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ token: resetToken, new_password: 'NewValidPass2!' });
    expect(resetRes.status).toBe(200);

    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});

// ── Resend OTP ────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/resend-otp', () => {
  const { sendOTPEmail } = require('../utils/email');

  beforeEach(() => {
    sendOTPEmail.mockClear();
  });

  test('unregistered email returns 200 with generic message and does not send email', async () => {
    const res = await agent
      .post('/api/v1/auth/resend-otp')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'nobody@nowhere.example', purpose: 'verify' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OTP resent ✅');
    expect(sendOTPEmail).not.toHaveBeenCalled();
  });

  test('registered user receives a fresh OTP and sendOTPEmail is called', async () => {
    await createVerifiedUser();

    // mockClear() in beforeEach resets counts including the verify-email call above
    sendOTPEmail.mockClear();

    const res = await agent
      .post('/api/v1/auth/resend-otp')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: USER.email, purpose: 'verify' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OTP resent ✅');
    expect(sendOTPEmail).toHaveBeenCalledTimes(1);

    const { rows } = await pool.query(
      'SELECT code FROM otp_codes WHERE email = $1 AND purpose = $2',
      [USER.email, 'verify']
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toMatch(/^\d{6}$/);
  });
});
