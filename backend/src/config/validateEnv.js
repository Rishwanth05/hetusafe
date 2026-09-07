'use strict';

// Startup env-var validation.
//
// Called once in server.js before any other module is loaded. Hard-required
// variables cause an immediate process.exit(1) so misconfigured deploys fail
// fast and loud (on Render this triggers a failed-deploy alert and keeps the
// previous version live). Soft-required variables emit a console.warn but let
// the app start — those features degrade gracefully at request time.

function validateEnv() {
  const missing = [];

  // ── Hard-required: absent → app is broken for every request ───────────────
  if (!process.env.JWT_SECRET)  missing.push('JWT_SECRET');
  if (!process.env.CSRF_SECRET) missing.push('CSRF_SECRET');

  // Database: one valid config must exist for the active environment.
  // Production expects DB_PROD_URL or DATABASE_URL (Render's injected var).
  // Dev/test expects DB_DEV_URL or the individual component vars.
  const isProd = process.env.NODE_ENV === 'production';
  const hasDb = isProd
    ? !!(process.env.DB_PROD_URL || process.env.DATABASE_URL)
    : !!(process.env.DB_DEV_URL ||
         (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME));

  if (!hasDb) {
    missing.push(
      isProd
        ? 'DB_PROD_URL or DATABASE_URL'
        : 'DB_DEV_URL (or DB_HOST + DB_USER + DB_NAME)',
    );
  }

  if (missing.length) {
    for (const v of missing) {
      console.error(`❌ Missing required environment variable: ${v}`);
    }
    process.exit(1);
    return; // only reached when process.exit is mocked (tests)
  }

  // ── Soft-required: absent → specific features degrade, app still starts ───
  // Skipped in the test environment to keep test output clean
  // (S3/AWS vars, for instance, are intentionally absent from .env.test because
  // those SDK calls are mocked in the test suite).
  if (process.env.NODE_ENV === 'test') return;

  const soft = [
    { key: 'REDIS_URL',                           note: 'rate-limiting and token blacklist fall back to localhost Redis' },
    { key: 'SENDGRID_API_KEY',                    note: 'all email sending (OTP, password reset) will fail' },
    { key: 'SENDGRID_FROM',                       note: 'outbound email sender address is missing' },
    { key: 'SENDGRID_TO',                         note: 'contact-form submissions will fail' },
    { key: 'GOOGLE_APPLICATION_CREDENTIALS_JSON', note: 'FCM push notifications will not be sent' },
    { key: 'S3_BUCKET_NAME',                      note: 'report image uploads will fail' },
    { key: 'AWS_REGION',                          note: 'report image uploads will fail' },
    { key: 'AWS_ACCESS_KEY_ID',                   note: 'report image uploads will fail' },
    { key: 'AWS_SECRET_ACCESS_KEY',               note: 'report image uploads will fail' },
    { key: 'FRONTEND_URL',                        note: 'production CORS origin will not be configured' },
  ];

  for (const { key, note } of soft) {
    if (!process.env[key]) {
      console.warn(`⚠️  ${key} is not set — ${note}`);
    }
  }
}

module.exports = { validateEnv };
