'use strict';

// Tests for the slow-query monitor after the /health-probe exclusion.
//
// Proves four properties:
//  1. A slow query with _skipSlowQuery:true is NOT reported (health-probe path).
//  2. A slow query through pool.query without the flag IS reported.
//  3. A slow query through a pool.connect() client IS reported (no false negatives).
//  4. A fast query reports nothing.
//
// Uses pg_sleep() to push queries past the 200 ms threshold, identical to db.test.js.

const pool = require('../db');

afterAll(async () => {
  await pool.end();
});

describe('slow-query monitor — health-probe exclusion (_skipSlowQuery)', () => {
  test('slow query with _skipSlowQuery:true is NOT reported to console or Sentry', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Mirrors exactly what app.js /health sends: a query object with the flag.
      await pool.query({ text: 'SELECT pg_sleep(0.25)', _skipSlowQuery: true });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('slow query through pool.query WITHOUT the flag IS still reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await pool.query('SELECT pg_sleep(0.25)');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/^\[slow-query\] \d+ms: /);
    } finally {
      warn.mockRestore();
    }
  });

  test('slow query through pool.connect() transaction client IS still reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_sleep(0.25)');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/^\[slow-query\] \d+ms: /);
    } finally {
      client.release();
      warn.mockRestore();
    }
  });

  test('fast query reports nothing regardless of the flag', async () => {
    // Warm the connection before installing the spy so a cold first-connect
    // latency cannot push the subsequent SELECT 1 assertions past 200 ms.
    await pool.query('SELECT 1');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await pool.query({ text: 'SELECT 1', _skipSlowQuery: true });
      await pool.query('SELECT 1');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
