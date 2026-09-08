'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../db');
const redis = require('../config/redis');

async function insertUser({ name = 'Test User', email, role = 'user' } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_verified, trust_score)
     VALUES ($1, $2, NULL, $3, true, 50)
     RETURNING id, email, role`,
    [name, email, role]
  );
  const user = rows[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { token, userId: user.id };
}

const createAdmin = () => insertUser({ role: 'admin', email: 'admin@masterdata-test.com' });
const createUser  = () => insertUser({ role: 'user',  email: 'user@masterdata-test.com' });

let agent;

beforeAll(async () => {
  agent = request.agent(app);
});

beforeEach(async () => {
  await redis.flushdb();
  await pool.query(`
    TRUNCATE users, otp_codes, refresh_tokens, password_reset_tokens,
             password_history, account_deletions, reports, notifications,
             notification_reads, report_status_history, resolution_votes,
             admin_audit_log
    RESTART IDENTITY CASCADE
  `);
  await pool.query('TRUNCATE hazard_categories RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

// ── GET /master/categories ────────────────────────────────────────────────────

describe('GET /api/v1/master/categories', () => {
  test('returns only active categories', async () => {
    await pool.query(
      "INSERT INTO hazard_categories (name, icon, is_active) VALUES ('Active Cat', '⚡', true), ('Inactive Cat', '🔥', false)"
    );

    const res = await agent.get('/api/v1/master/categories');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Active Cat');
    expect(res.body[0].icon).toBe('⚡');
  });

  test('returns icon field for categories that have one', async () => {
    await pool.query(
      "INSERT INTO hazard_categories (name, icon) VALUES ('Electric Hazard', '⚡')"
    );

    const res = await agent.get('/api/v1/master/categories');

    expect(res.status).toBe(200);
    expect(res.body[0].icon).toBe('⚡');
  });
});

// ── POST /master/categories ───────────────────────────────────────────────────

describe('POST /api/v1/master/categories', () => {
  test('admin can create a category with an emoji icon', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .post('/api/v1/master/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Electric Hazard', icon: '⚡' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Electric Hazard');
    expect(res.body.icon).toBe('⚡');
    expect(res.body.is_active).toBe(true);
  });

  test('newly created category is active by default and visible on GET', async () => {
    const { token } = await createAdmin();
    await agent
      .post('/api/v1/master/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Hazard', icon: '🔥' });

    const res = await agent.get('/api/v1/master/categories');
    expect(res.status).toBe(200);
    const names = res.body.map(c => c.name);
    expect(names).toContain('New Hazard');
  });

  test('non-admin cannot create a category', async () => {
    const { token } = await createUser();
    const res = await agent
      .post('/api/v1/master/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Unauthorized Cat' });

    expect(res.status).toBe(403);
  });
});

// ── PATCH /master/categories/:id/toggle ──────────────────────────────────────

describe('PATCH /api/v1/master/categories/:id/toggle', () => {
  test('admin can toggle an active category to inactive', async () => {
    const { token } = await createAdmin();
    const { rows } = await pool.query(
      "INSERT INTO hazard_categories (name, is_active) VALUES ('Toggle Me', true) RETURNING id"
    );
    const id = rows[0].id;

    const res = await agent
      .patch(`/api/v1/master/categories/${id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  test('admin can toggle an inactive category to active', async () => {
    const { token } = await createAdmin();
    const { rows } = await pool.query(
      "INSERT INTO hazard_categories (name, is_active) VALUES ('Activate Me', false) RETURNING id"
    );
    const id = rows[0].id;

    const res = await agent
      .patch(`/api/v1/master/categories/${id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(true);
  });

  test('toggled-off category disappears from public GET', async () => {
    const { token } = await createAdmin();
    const { rows } = await pool.query(
      "INSERT INTO hazard_categories (name, is_active) VALUES ('Hidden Cat', true) RETURNING id"
    );
    const id = rows[0].id;

    await agent
      .patch(`/api/v1/master/categories/${id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    const listRes = await agent.get('/api/v1/master/categories');
    const names = listRes.body.map(c => c.name);
    expect(names).not.toContain('Hidden Cat');
  });

  test('non-admin gets 403', async () => {
    const { token } = await createUser();
    const { rows } = await pool.query(
      "INSERT INTO hazard_categories (name) VALUES ('Some Cat') RETURNING id"
    );
    const id = rows[0].id;

    const res = await agent
      .patch(`/api/v1/master/categories/${id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('unauthenticated request gets 401', async () => {
    const { rows } = await pool.query(
      "INSERT INTO hazard_categories (name) VALUES ('Some Cat 2') RETURNING id"
    );
    const id = rows[0].id;

    const res = await agent
      .patch(`/api/v1/master/categories/${id}/toggle`);

    expect(res.status).toBe(401);
  });

  test('toggling a non-existent category returns 404', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .patch('/api/v1/master/categories/999999/toggle')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
