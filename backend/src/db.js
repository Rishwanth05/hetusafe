const { Pool } = require('pg');
require('dotenv').config();

const POOL_TUNING = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

function getConnectionConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  const url = isProd ? process.env.DB_PROD_URL : process.env.DB_DEV_URL;

  if (url) return { connectionString: url, ...POOL_TUNING };
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, ...POOL_TUNING };

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

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;
