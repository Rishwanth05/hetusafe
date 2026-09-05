'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../db');
const redis = require('../config/redis');

// Prevent accidental real email sends if any code path touches sendOTPEmail
jest.mock('../utils/email', () => ({
  generateOTP: jest.requireActual('../utils/email').generateOTP,
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
// Insert users and sign tokens directly — bypasses the OTP/email flow since
// admin tests are about route logic, not authentication mechanics.

async function insertUser({ name = 'Test User', email = 'user@admin-test.com', role = 'user' } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_verified, trust_score)
     VALUES ($1, $2, NULL, $3, true, 50)
     RETURNING id, email, role, trust_score`,
    [name, email, role]
  );
  const user = rows[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { token, userId: user.id, user };
}

// Convenience wrappers
const createUser = (overrides) => insertUser({ role: 'user', ...overrides });
const createAdmin = (overrides) => insertUser({ role: 'admin', email: 'admin@admin-test.com', ...overrides });

async function insertReport(userId, overrides = {}) {
  const { rows } = await pool.query(
    `INSERT INTO reports (user_id, hazard_type, severity, description, latitude, longitude)
     VALUES ($1, $2, $3, $4, 12.9716, 77.5946) RETURNING id`,
    [
      userId,
      overrides.hazard_type ?? 'Pothole',
      overrides.severity ?? 'medium',
      overrides.description ?? 'Test hazard',
    ]
  );
  return rows[0].id;
}

// ── Shared state ──────────────────────────────────────────────────────────────

let agent;
let csrfToken;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  agent = request.agent(app);
  const res = await agent.get('/api/csrf-token');
  csrfToken = res.body.csrfToken;
  expect(csrfToken).toBeTruthy();
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
});

afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

// ── Auth / role enforcement ───────────────────────────────────────────────────
// The middleware chain on ALL admin routes is:
//   doubleCsrfProtection → verifyToken (401) → requireAdmin (403)
// GET requests skip CSRF. We use GET /admin/stats as the representative route.

describe('Admin auth / role enforcement', () => {
  test('unauthenticated request returns 401', async () => {
    const res = await agent.get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  test('regular (non-admin) authenticated user returns 403', async () => {
    const { token } = await createUser();
    const res = await agent
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  test('admin user can access admin routes', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── GET /admin/stats ──────────────────────────────────────────────────────────

describe('GET /api/v1/admin/stats', () => {
  test('returns expected stats structure', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({
      total_users: expect.any(Number),
      total_reports: expect.any(Number),
      resolved_reports: expect.any(Number),
      critical_reports: expect.any(Number),
    });
    expect(Array.isArray(res.body.recent_reports)).toBe(true);
    expect(Array.isArray(res.body.reports_by_day)).toBe(true);
    expect(Array.isArray(res.body.reports_by_severity)).toBe(true);
  });

  test('stats reflect created data', async () => {
    const { token, userId } = await createAdmin();
    await insertReport(userId);

    const res = await agent
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.stats.total_users).toBe(1);
    expect(res.body.stats.total_reports).toBe(1);
  });
});

// ── GET /admin/users ──────────────────────────────────────────────────────────

describe('GET /api/v1/admin/users', () => {
  test('returns paginated user list', async () => {
    const { token } = await createAdmin();
    await createUser({ email: 'user2@admin-test.com' });

    const res = await agent
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBe(2); // admin + regular user
  });

  test('search parameter filters by name or email', async () => {
    const { token } = await createAdmin();
    await createUser({ name: 'Findable Person', email: 'findable@admin-test.com' });
    await createUser({ name: 'Other Person', email: 'other@admin-test.com' });

    const res = await agent
      .get('/api/v1/admin/users?search=Findable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].name).toBe('Findable Person');
  });
});

// ── DELETE /admin/users/:id ───────────────────────────────────────────────────

describe('DELETE /api/v1/admin/users/:id', () => {
  test('deletes the user and writes an audit log entry', async () => {
    const { token: adminToken, userId: adminId } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'tobedeleted@admin-test.com' });

    const res = await agent
      .delete(`/api/v1/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);

    // User is gone
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [targetId]);
    expect(rows).toHaveLength(0);

    // Audit log entry was created
    const { rows: log } = await pool.query(
      "SELECT * FROM admin_audit_log WHERE action = 'delete_user'"
    );
    expect(log).toHaveLength(1);
    expect(log[0].admin_id).toBe(adminId);
    expect(log[0].target_id).toBe(String(targetId));
  });

  test("deleted user's reports have user_id set to NULL (not deleted)", async () => {
    const { token: adminToken } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'reporter@admin-test.com' });
    const reportId = await insertReport(targetId);

    await agent
      .delete(`/api/v1/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    const { rows } = await pool.query('SELECT user_id FROM reports WHERE id = $1', [reportId]);
    expect(rows[0].user_id).toBeNull();
  });
});

// ── DELETE /admin/users/:id — self-delete guard ────────────────────────────────

describe('DELETE /api/v1/admin/users/:id — self-delete guard', () => {
  test('returns 403 when an admin tries to delete their own account', async () => {
    const { token: adminToken, userId: adminId } = await createAdmin();

    const res = await agent
      .delete(`/api/v1/admin/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot delete your own/i);

    // Account must be untouched
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [adminId]);
    expect(rows).toHaveLength(1);
  });
});

// ── DELETE /admin/users/:id — transaction rollback ─────────────────────────────

describe('DELETE /api/v1/admin/users/:id — transaction rollback', () => {
  afterEach(() => jest.restoreAllMocks());

  test('rolls back user deletion and report anonymization if audit-log insert fails', async () => {
    const { token: adminToken } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'rollback-victim@admin-test.com' });
    const reportId = await insertReport(targetId);

    // The handler calls pool.connect() directly with no preceding pool.query(),
    // so mockImplementationOnce is safe — it intercepts exactly the transaction client.
    const originalConnect = pool.connect.bind(pool);
    jest.spyOn(pool, 'connect').mockImplementationOnce(() =>
      originalConnect().then((client) => {
        const orig = client.query.bind(client);
        jest.spyOn(client, 'query').mockImplementation(function (...args) {
          const sql = (typeof args[0] === 'string' ? args[0] : (args[0]?.text ?? '')).trim();
          if (sql.startsWith('INSERT') && sql.includes('admin_audit_log')) {
            return Promise.reject(new Error('Forced audit-log failure'));
          }
          return orig(...args);
        });
        return client;
      })
    );

    const res = await agent
      .delete(`/api/v1/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).not.toBe(200);

    // User must NOT have been deleted (all three writes were rolled back together)
    const { rows: users } = await pool.query(
      'SELECT id FROM users WHERE id = $1', [targetId]
    );
    expect(users).toHaveLength(1);

    // Report must NOT have been anonymized (rolled back with the rest)
    const { rows: reports } = await pool.query(
      'SELECT user_id FROM reports WHERE id = $1', [reportId]
    );
    expect(reports[0].user_id).toBe(targetId);
  });
});

// ── PUT /admin/users/:id/role ─────────────────────────────────────────────────

describe('PUT /api/v1/admin/users/:id/role', () => {
  test('changes a user role and writes an audit log entry', async () => {
    const { token: adminToken, userId: adminId } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'promote@admin-test.com' });

    const res = await agent
      .put(`/api/v1/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [targetId]);
    expect(rows[0].role).toBe('admin');

    const { rows: log } = await pool.query(
      "SELECT * FROM admin_audit_log WHERE action = 'change_user_role'"
    );
    expect(log).toHaveLength(1);
    expect(log[0].admin_id).toBe(adminId);
  });

  test('invalid role value returns 400', async () => {
    const { token: adminToken } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'badrole@admin-test.com' });

    const res = await agent
      .put(`/api/v1/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'superuser' });

    expect(res.status).toBe(400);
  });
});

// ── GET /admin/reports ────────────────────────────────────────────────────────

describe('GET /api/v1/admin/reports', () => {
  test('returns report list with user details', async () => {
    const { token: adminToken } = await createAdmin();
    const { userId } = await createUser({ email: 'reporter2@admin-test.com' });
    await insertReport(userId, { severity: 'critical' });

    const res = await agent
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.reports[0].severity).toBe('critical');
    expect(res.body.reports[0].user_name).toBeTruthy();
  });

  test('status filter works', async () => {
    const { token: adminToken } = await createAdmin();
    const { userId } = await createUser({ email: 'reporter3@admin-test.com' });
    await insertReport(userId);
    await pool.query(
      "INSERT INTO reports (user_id, hazard_type, severity, description, latitude, longitude, status) VALUES ($1, 'Flood', 'high', 'desc', 1, 1, 'resolved')",
      [userId]
    );

    const res = await agent
      .get('/api/v1/admin/reports?status=resolved')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.reports[0].status).toBe('resolved');
  });
});

// ── PUT /admin/reports/:id/status ─────────────────────────────────────────────

describe('PUT /api/v1/admin/reports/:id/status', () => {
  let adminToken;
  let adminUserId;
  let reportOwnerId;
  let reportId;

  beforeEach(async () => {
    ({ token: adminToken, userId: adminUserId } = await createAdmin());
    ({ userId: reportOwnerId } = await createUser({ email: 'owner@admin-test.com' }));
    reportId = await insertReport(reportOwnerId);
  });

  test('changes the report status and records status history', async () => {
    const res = await agent
      .put(`/api/v1/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'under_review' });

    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT status FROM reports WHERE id = $1', [reportId]);
    expect(rows[0].status).toBe('under_review');

    const { rows: history } = await pool.query(
      'SELECT * FROM report_status_history WHERE report_id = $1',
      [reportId]
    );
    expect(history).toHaveLength(1);
    expect(history[0].new_status).toBe('under_review');
    expect(history[0].user_role).toBe('admin');
  });

  test('invalid status value returns 400', async () => {
    const res = await agent
      .put(`/api/v1/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'nonexistent_status' });

    expect(res.status).toBe(400);
  });

  // Documents CURRENT behavior: admin status change does NOT send a
  // notification and does NOT update the report owner's trust score.
  test('status change does NOT create a notification (current behavior)', async () => {
    await agent
      .put(`/api/v1/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'resolved' });

    const { rows } = await pool.query('SELECT COUNT(*) FROM notifications');
    expect(parseInt(rows[0].count)).toBe(0);
  });

  test('status change does NOT update the report owner trust score (current behavior)', async () => {
    const {
      rows: [{ trust_score: before }],
    } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [reportOwnerId]);

    await agent
      .put(`/api/v1/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'resolved' });

    const {
      rows: [{ trust_score: after }],
    } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [reportOwnerId]);

    expect(after).toBe(before); // unchanged
  });
});

// ── DELETE /admin/reports/:id ─────────────────────────────────────────────────

describe('DELETE /api/v1/admin/reports/:id', () => {
  test('deletes the report and writes an audit log entry', async () => {
    const { token: adminToken, userId: adminId } = await createAdmin();
    const { userId } = await createUser({ email: 'repowner@admin-test.com' });
    const reportId = await insertReport(userId);

    const res = await agent
      .delete(`/api/v1/admin/reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT id FROM reports WHERE id = $1', [reportId]);
    expect(rows).toHaveLength(0);

    const { rows: log } = await pool.query(
      "SELECT * FROM admin_audit_log WHERE action = 'delete_report'"
    );
    expect(log).toHaveLength(1);
    expect(log[0].admin_id).toBe(adminId);
  });
});

// ── POST /admin/reports/:id/archive & /unarchive ─────────────────────────────

describe('POST /api/v1/admin/reports/:id/archive', () => {
  let adminToken, adminUserId, reportId;

  beforeEach(async () => {
    ({ token: adminToken, userId: adminUserId } = await createAdmin());
    const { userId } = await createUser({ email: 'archowner@admin-test.com' });
    reportId = await insertReport(userId);
  });

  test('non-admin gets 403', async () => {
    const { token: userToken } = await createUser({ email: 'notadmin@admin-test.com' });
    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/archive`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(403);
  });

  test('unauthenticated gets 401', async () => {
    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/archive`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(401);
  });

  test('archives a report: sets archived_at, busts cache, writes audit log', async () => {
    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archived/i);

    // archived_at is now set
    const { rows } = await pool.query('SELECT archived_at FROM reports WHERE id = $1', [reportId]);
    expect(rows[0].archived_at).not.toBeNull();

    // audit log entry
    const { rows: log } = await pool.query(
      "SELECT * FROM admin_audit_log WHERE action = 'archive_report'"
    );
    expect(log).toHaveLength(1);
    expect(log[0].admin_id).toBe(adminUserId);
    expect(log[0].target_id).toBe(String(reportId));
    expect(log[0].old_value).toMatchObject({ archived_at: null });
    expect(log[0].new_value.archived_at).toBeTruthy();
  });

  test('archived report does NOT appear in GET /reports/all', async () => {
    // archive it
    await agent
      .post(`/api/v1/admin/reports/${reportId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    // public feed must exclude it
    const feedRes = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(feedRes.status).toBe(200);
    const ids = feedRes.body.map(r => r.id);
    expect(ids).not.toContain(reportId);
  });

  test('archiving an already-archived report returns 409', async () => {
    await agent
      .post(`/api/v1/admin/reports/${reportId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(409);
  });

  test('archiving a non-existent report returns 404', async () => {
    const res = await agent
      .post('/api/v1/admin/reports/999999/archive')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/admin/reports/:id/unarchive', () => {
  let adminToken, adminUserId, reportId;

  beforeEach(async () => {
    ({ token: adminToken, userId: adminUserId } = await createAdmin());
    const { userId } = await createUser({ email: 'unarchowner@admin-test.com' });
    reportId = await insertReport(userId);
    // pre-archive the report so unarchive tests start from archived state
    await pool.query('UPDATE reports SET archived_at = NOW() WHERE id = $1', [reportId]);
  });

  test('non-admin gets 403', async () => {
    const { token: userToken } = await createUser({ email: 'notadmin2@admin-test.com' });
    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/unarchive`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(403);
  });

  test('unarchives a report: clears archived_at, busts cache, writes audit log', async () => {
    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/unarchive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unarchived/i);

    // archived_at is now NULL
    const { rows } = await pool.query('SELECT archived_at FROM reports WHERE id = $1', [reportId]);
    expect(rows[0].archived_at).toBeNull();

    // audit log entry
    const { rows: log } = await pool.query(
      "SELECT * FROM admin_audit_log WHERE action = 'unarchive_report'"
    );
    expect(log).toHaveLength(1);
    expect(log[0].admin_id).toBe(adminUserId);
    expect(log[0].target_id).toBe(String(reportId));
    expect(log[0].old_value.archived_at).toBeTruthy();
    expect(log[0].new_value).toMatchObject({ archived_at: null });
  });

  test('unarchived report reappears in GET /reports/all', async () => {
    await agent
      .post(`/api/v1/admin/reports/${reportId}/unarchive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);

    const feedRes = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(feedRes.status).toBe(200);
    const ids = feedRes.body.map(r => r.id);
    expect(ids).toContain(reportId);
  });

  test('unarchiving a non-archived report returns 409', async () => {
    // clear the pre-archive
    await pool.query('UPDATE reports SET archived_at = NULL WHERE id = $1', [reportId]);

    const res = await agent
      .post(`/api/v1/admin/reports/${reportId}/unarchive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(409);
  });

  test('unarchiving a non-existent report returns 404', async () => {
    const res = await agent
      .post('/api/v1/admin/reports/999999/unarchive')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(404);
  });
});

// ── GET /admin/analytics ──────────────────────────────────────────────────────

describe('GET /api/v1/admin/analytics', () => {
  test('returns analytics structure (works on empty DB)', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.by_day)).toBe(true);
    expect(res.body.by_day).toHaveLength(30); // always 30-day window
    expect(Array.isArray(res.body.by_category)).toBe(true);
    expect(Array.isArray(res.body.by_severity)).toBe(true);
    expect(typeof res.body.avg_resolution_hours).toBe('number');
  });
});

// ── POST /admin/broadcast ─────────────────────────────────────────────────────

describe('POST /api/v1/admin/broadcast', () => {
  test('creates a broadcast notification in the DB', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .post('/api/v1/admin/broadcast')
      .set('Authorization', `Bearer ${token}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test Alert', message: 'Something happened', severity: 'high' });

    expect(res.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE type = 'broadcast'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Test Alert');
    expect(rows[0].severity).toBe('high');
    // Broadcast is not targeted — user_id should be NULL
    expect(rows[0].user_id ?? null).toBeNull();
  });

  test('missing title returns 400', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .post('/api/v1/admin/broadcast')
      .set('Authorization', `Bearer ${token}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ message: 'No title here' });

    expect(res.status).toBe(400);
  });
});

// ── GET /admin/audit-log ──────────────────────────────────────────────────────

describe('GET /api/v1/admin/audit-log', () => {
  test('returns empty log on fresh DB', async () => {
    const { token } = await createAdmin();
    const res = await agent
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  test('log contains entries after admin actions', async () => {
    const { token: adminToken } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'logtest@admin-test.com' });

    // Generate one audit entry
    await agent
      .put(`/api/v1/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'admin' });

    const res = await agent
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.entries[0].action).toBe('change_user_role');
  });
});

// ── CSRF enforcement ──────────────────────────────────────────────────────────
// doubleCsrfProtection runs BEFORE verifyToken on all state-changing methods.
// The error code EBADCSRFTOKEN maps to: 403 + { message: 'Invalid or missing CSRF token.' }

describe('CSRF protection', () => {
  test('POST without X-CSRF-Token header returns 403 with CSRF error', async () => {
    // agent has the _csrf cookie; omitting the header causes the double-submit check to fail
    const res = await agent
      .post('/api/v1/auth/signup')
      // deliberately no .set('X-CSRF-Token', ...)
      .send({ name: 'Test', email: 'csrf1@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/csrf/i);
  });

  test('POST with a wrong X-CSRF-Token value returns 403', async () => {
    const res = await agent
      .post('/api/v1/auth/signup')
      .set('X-CSRF-Token', 'completely-wrong-token')
      .send({ name: 'Test', email: 'csrf2@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/csrf/i);
  });

  test('POST with the correct X-CSRF-Token passes CSRF and reaches route logic', async () => {
    // forgot-password returns 200 for unknown emails without sending any email,
    // so this test works without an email mock and without creating any user.
    const res = await agent
      .post('/api/v1/auth/forgot-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'nobody@example.com' });

    // 200 = CSRF passed; a 403 would mean CSRF was rejected
    expect(res.status).toBe(200);
  });

  test('DELETE without CSRF token returns 403 (not 401 — CSRF runs first)', async () => {
    const { token: adminToken } = await createAdmin();
    const { userId: targetId } = await createUser({ email: 'csrfdelete@admin-test.com' });

    const res = await agent
      .delete(`/api/v1/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    // No X-CSRF-Token

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/csrf/i);
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
// authLimiter: max 20 requests per 15 min per IP, backed by Redis.
// Route used: POST /forgot-password — fast (simple DB SELECT, returns 200 for
// unknown emails without sending anything), and has no dedicated per-route
// rate limiter of its own.

describe('Rate limiting on auth routes', () => {
  test('first request succeeds; repeated requests past the limit return 429', async () => {
    // beforeEach already flushed Redis, so the counter starts at 0.

    // Request #1 — clearly under the limit, must succeed
    const first = await agent
      .post('/api/v1/auth/forgot-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'rl0@example.com' });
    expect(first.status).toBe(200);

    // Fire more requests until we hit 429. The authLimiter is configured at
    // max=20; we stop at 30 to avoid an infinite loop if the limiter ever
    // changes. We break as soon as we see the first 429.
    let hit429 = false;
    for (let i = 1; i <= 30; i++) {
      const res = await agent
        .post('/api/v1/auth/forgot-password')
        .set('X-CSRF-Token', csrfToken)
        .send({ email: `rl${i}@example.com` });

      if (res.status === 429) {
        expect(res.body.message).toMatch(/too many/i);
        hit429 = true;
        break;
      }
    }

    // We must have hit 429 somewhere within the 30-request window
    expect(hit429).toBe(true);
  });
});
