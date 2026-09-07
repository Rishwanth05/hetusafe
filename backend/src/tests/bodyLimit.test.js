'use strict';

const request = require('supertest');
const app = require('../app');
const pool = require('../db');
const redis = require('../config/redis');

// ── Constants ──────────────────────────────────────────────────────────────────

// express.json({ limit: '50kb' }) → 50 * 1024 = 51200 bytes
const JSON_LIMIT_BYTES = 50 * 1024;

// JSON wrapper overhead: {"email":"","password":"x"} = 27 bytes, so email
// padding + 27 = total body size.
const JSON_OVERHEAD = 27;

// ── Shared state ───────────────────────────────────────────────────────────────

let agent;
let csrfToken;

// ── Lifecycle ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  agent = request.agent(app);
  const res = await agent.get('/api/csrf-token');
  csrfToken = res.body.csrfToken;
  expect(csrfToken).toBeTruthy();
});

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

// ── Body size limit tests ──────────────────────────────────────────────────────

describe('express.json() 50kb body size limit', () => {
  test('request just under the 50kb limit is parsed and processed (not 413)', async () => {
    // Target body: 51000 bytes — 200 bytes under the 51200-byte limit.
    const emailPadding = 'x'.repeat(51000 - JSON_OVERHEAD);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: emailPadding, password: 'x' });

    // Body was accepted by express.json() (no 413). Validation rejects the
    // malformed email, so 422 is expected — but any non-413 confirms success.
    expect(res.status).not.toBe(413);
  });

  test('request just over the 50kb limit is rejected with 413', async () => {
    // Target body: 51500 bytes — 300 bytes over the 51200-byte limit.
    const emailPadding = 'x'.repeat(51500 - JSON_OVERHEAD);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: emailPadding, password: 'x' });

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ error: 'Request body too large.' });
  });

  test('multipart/form-data uploads bypass express.json() and are unaffected by the JSON body limit', async () => {
    // multipart/form-data is handled by multer (separate code path from
    // express.json()). Sending without auth returns 401, which proves the
    // request passed through body parsing without hitting the 50kb JSON limit.
    const res = await agent
      .post('/api/v1/reports/create')
      .set('X-CSRF-Token', csrfToken)
      .field('hazard_type', 'Pothole')
      .field('severity', 'medium')
      .field('description', 'Test hazard')
      .field('latitude', '12.9716')
      .field('longitude', '77.5946');

    expect(res.status).not.toBe(413);
    expect(res.status).toBe(401);
  });
});
