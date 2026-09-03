'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

// .env.test.local is gitignored and overrides individual values from .env.test
// for local development (e.g. DB_DEV_URL with the local Postgres password).
const localEnv = path.resolve(__dirname, '../../.env.test.local');
if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv, override: true });
}

module.exports = async () => {
  const { Pool } = require('pg');
  const Redis = require('ioredis');

  // Verify the test DB is reachable
  const pool = new Pool({ connectionString: process.env.DB_DEV_URL });
  try {
    await pool.query('SELECT 1');
    console.log('\n[test setup] save_test DB connected ✓');
  } catch (err) {
    console.error('\n[test setup] save_test DB connection failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }

  // Flush Redis DB 1 so rate-limit counters from previous runs don't interfere
  const redis = new Redis(process.env.REDIS_URL);
  await redis.flushdb();
  await redis.quit();
  console.log('[test setup] Redis DB 1 flushed ✓');
};
