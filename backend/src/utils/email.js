const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = process.env.SENDGRID_FROM;

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendOTPEmail(toEmail, otp, purpose = 'verify') {
  const subjects = {
    verify: 'Hetusafe — Verify your email',
    login: 'Hetusafe — Your login OTP',
    delete: 'Hetusafe — Confirm account deletion',
    lockout: 'Hetusafe — Account locked',
  };

  const intros = {
    verify: 'Thanks for signing up! Use this OTP to verify your email address.',
    login: 'Use this OTP to complete your login.',
    delete: '⚠️ You requested to delete your account. Use this OTP to confirm.',
    lockout: '🔒 Your account has been locked due to too many failed login attempts.',
  };

  const body = purpose === 'lockout'
    ? `
      <div style="background:#fff;border:2px solid #fecaca;border-radius:10px;padding:24px;text-align:center;margin:20px 0">
        <p style="color:#dc2626;font-size:32px;margin:0">🔒</p>
        <p style="color:#0f172a;font-size:16px;font-weight:700;margin:8px 0">Account Temporarily Locked</p>
        <p style="color:#64748b;font-size:14px;margin:0">Too many failed password attempts. Your account is locked for <strong>30 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;margin:16px 0 0">If this wasn't you, reset your password immediately.</p>
      </div>
    `
    : `
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:10px;padding:24px;text-align:center;margin:20px 0">
        <p style="color:#64748b;font-size:13px;margin:0 0 8px">Your one-time code</p>
        <p style="color:#16a34a;font-size:42px;font-weight:800;letter-spacing:10px;margin:0">${otp}</p>
        <p style="color:#94a3b8;font-size:12px;margin:12px 0 0">Expires in 10 minutes</p>
      </div>
    `;

  const msg = {
    to: toEmail,
    from: FROM,
    subject: subjects[purpose] || subjects.verify,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="background:#16a34a;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">🛡️ Hetusafe</h1>
        </div>
        <p style="color:#0f172a;font-size:16px;margin-bottom:8px">${intros[purpose]}</p>
        ${body}
        <p style="color:#94a3b8;font-size:12px;text-align:center">If you didn't request this, ignore this email.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
}

async function sendResetEmail(toEmail, resetLink) {
  const msg = {
    to: toEmail,
    from: FROM,
    subject: 'Hetusafe — Reset your password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="background:#16a34a;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">🛡️ Hetusafe</h1>
        </div>
        <p style="color:#0f172a;font-size:16px;margin-bottom:8px">You requested a password reset.</p>
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:10px;padding:24px;text-align:center;margin:20px 0">
          <p style="color:#64748b;font-size:13px;margin:0 0 16px">Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none">Reset Password</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  };
  await sgMail.send(msg);
}
module.exports = { generateOTP, sendOTPEmail, sendResetEmail };