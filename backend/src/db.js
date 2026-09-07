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

// Shared slow-query reporter — fires for both pool.query and transaction clients.
function reportSlowQuery(sql, duration) {
  console.warn(`[slow-query] ${duration}ms: ${sql.slice(0, 200)}`);
  if (Sentry) {
    Sentry.captureMessage('Slow query detected', {
      level: 'warning',
      extra: { query: sql.slice(0, 200), duration_ms: duration },
    });
  }
}

// Wraps any query function with slow-query timing. Arguments are spread so all
// pg call signatures (text, text+values, query-object) are passed through unchanged.
function wrapQuery(queryFn) {
  return async function slowQueryAware(...args) {
    const start = Date.now();
    const result = await queryFn(...args);
    const duration = Date.now() - start;
    if (duration > 200) {
      const text = args[0];
      const sql = typeof text === 'string' ? text : (text && text.text) || '';
      reportSlowQuery(sql, duration);
    }
    return result;
  };
}

pool.query = wrapQuery(pool.query.bind(pool));

// Wrap pool.connect() so every checked-out client gets the same slow-query
// instrumentation on its query() method. The callback style (used only by the
// startup connectivity check below) is passed through unchanged.
const _connect = pool.connect.bind(pool);
pool.connect = function instrumentedConnect(...args) {
  if (typeof args[0] === 'function') {
    return _connect(...args);
  }
  return _connect().then(client => {
    client.query = wrapQuery(client.query.bind(client));
    return client;
  });
};

module.exports = pool;
