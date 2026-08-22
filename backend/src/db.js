const { Pool } = require('pg');
require('dotenv').config();

const Sentry = process.env.SENTRY_DSN ? require('@sentry/node') : null;

const POOL_TUNING = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

function getConnectionConfig() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (process.env.DB_PROD_URL) {
      return { connectionString: process.env.DB_PROD_URL, ...POOL_TUNING };
    }
    if (process.env.DATABASE_URL) {
      return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, ...POOL_TUNING };
    }
  }

  if (process.env.DB_DEV_URL) {
    return { connectionString: process.env.DB_DEV_URL, ...POOL_TUNING };
  }

  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...POOL_TUNING,
  };
}

const pool = new Pool(getConnectionConfig());

// Defer the startup connectivity check until after all modules finish loading.
// pool.connect() starts a 2 s timer immediately; if synchronous module loading
// (Firebase, AWS SDK, routes) takes longer the timer fires before the callback
// can run even though Postgres is reachable.
setImmediate(() => {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ PostgreSQL connection failed:', err.message);
    } else {
      console.log('✅ PostgreSQL connected successfully');
      release();
    }
  });
});

const _query = pool.query.bind(pool);
pool.query = async function slowQueryAware(text, params) {
  const start = Date.now();
  const result = await _query(text, params);
  const duration = Date.now() - start;
  if (duration > 200 && Sentry) {
    const sql = typeof text === 'string' ? text : (text && text.text) || '';
    Sentry.captureMessage('Slow query detected', {
      level: 'warning',
      extra: { query: sql.slice(0, 200), duration_ms: duration },
    });
  }
  return result;
};

module.exports = pool;
