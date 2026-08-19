'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

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
