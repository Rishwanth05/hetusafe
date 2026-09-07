'use strict';

// Tests for the slow-query monitor in db.js.
// Uses pg_sleep(0.25) to force queries over the 200ms threshold.

const pool = require('../db');

afterAll(async () => {
  await pool.end();
});

describe('slow-query monitor — pool.query (non-transaction)', () => {
  test('slow query logs a [slow-query] warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await pool.query('SELECT pg_sleep(0.25)');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/^\[slow-query\] \d+ms: /);
    } finally {
      warn.mockRestore();
    }
  });

  test('fast query does not log a warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await pool.query('SELECT 1');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('slow-query monitor — transaction client (pool.connect)', () => {
  test('slow query inside a transaction logs the same [slow-query] warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_sleep(0.25)');
      await client.query('COMMIT');
      // Exactly one warning: the pg_sleep — BEGIN and COMMIT are fast
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/^\[slow-query\] \d+ms: /);
    } finally {
      client.release();
      warn.mockRestore();
    }
  });

  test('fast queries inside a transaction do not log a warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT 1');
      await client.query('COMMIT');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      client.release();
      warn.mockRestore();
    }
  });

  test('transaction returns correct results and wrapping does not affect data', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT $1::int AS val', [42]);
      await client.query('COMMIT');
      expect(rows[0].val).toBe(42);
    } finally {
      client.release();
    }
  });
});
