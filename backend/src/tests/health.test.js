'use strict';

// Tests for GET /health.
//
// The endpoint must actually probe DB and Redis, not just return 200
// unconditionally. These tests verify:
//   1. 200 when both are reachable.
//   2. 503 when DB query fails.
//   3. 503 when Redis ping fails.
//   4. 503 when both fail.
//   5. 503 within 2.5 s when a dependency hangs (timeout guard).
//   6. 503 shutting_down when pool is ended (graceful-shutdown state).
//   7. 503 shutting_down when redis is quit (graceful-shutdown state).
//
// Failures are simulated by mocking pool.query / redis.ping so real services
// are never taken down.

const request = require('supertest');
const app     = require('../app');
const pool    = require('../db');
const redis   = require('../config/redis');

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('GET /health', () => {
  test('returns 200 with checks.db=ok and checks.redis=ok when both are reachable', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.db).toBe('ok');
    expect(res.body.checks.redis).toBe('ok');
    expect(res.body.time).toBeTruthy();
  });

  test('returns 503 degraded when DB query fails', async () => {
    jest.spyOn(pool, 'query').mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toMatch(/connection refused/);
    expect(res.body.checks.redis).toBe('ok');
  });

  test('returns 503 degraded when Redis ping fails', async () => {
    jest.spyOn(redis, 'ping').mockRejectedValue(new Error('Connection is closed.'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('ok');
    expect(res.body.checks.redis).toMatch(/Connection is closed/);
  });

  test('returns 503 degraded when both DB and Redis are down', async () => {
    jest.spyOn(pool,  'query').mockRejectedValue(new Error('DB unreachable'));
    jest.spyOn(redis, 'ping').mockRejectedValue(new Error('Redis unreachable'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('DB unreachable');
    expect(res.body.checks.redis).toBe('Redis unreachable');
  });

  test('responds within 2.5 s and returns 503 when DB hangs (timeout guard)', async () => {
    // Never-resolving promise simulates a completely hung DB connection.
    jest.spyOn(pool, 'query').mockReturnValue(new Promise(() => {}));

    const start = Date.now();
    const res   = await request(app).get('/health');
    const ms    = Date.now() - start;

    expect(res.status).toBe(503);
    expect(res.body.checks.db).toBe('timeout');
    // Must resolve well within HEALTH_TIMEOUT_MS (2 s) + test overhead.
    expect(ms).toBeLessThan(2500);
  }, 5000); // generous Jest timeout so the test itself doesn't time out

  test('returns 503 shutting_down without querying when pool is ended', async () => {
    // Simulate the state pool.end() leaves the pool in.
    const querySpy = jest.spyOn(pool, 'query');
    const orig = pool.ended;
    pool.ended = true;

    const res = await request(app).get('/health');

    pool.ended = orig;

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('shutting_down');
    // Should have short-circuited — no actual DB query attempted.
    expect(querySpy).not.toHaveBeenCalled();
  });

  test('returns 503 shutting_down without querying when redis is quit', async () => {
    // Simulate the state redis.quit() leaves the client in.
    const pingSpy = jest.spyOn(redis, 'ping');
    const orig = redis.status;
    redis.status = 'end';

    const res = await request(app).get('/health');

    redis.status = orig;

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('shutting_down');
    // Should have short-circuited — no actual Redis ping attempted.
    expect(pingSpy).not.toHaveBeenCalled();
  });
});
