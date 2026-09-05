const express = require('express');
const pool = require('../db');
const redis = require('../config/redis');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { z } = require('zod');
const validate = require('../middleware/validate');

const router = express.Router();

// All admin routes require auth + admin role
router.use(verifyToken, requireAdmin);

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be 500 characters or less'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

// ── DASHBOARD STATS ────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [users, reports, resolved, critical] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM reports'),
      pool.query("SELECT COUNT(*) FROM reports WHERE status = 'resolved'"),
      pool.query("SELECT COUNT(*) FROM reports WHERE severity = 'critical'"),
    ]);

    const recentReports = await pool.query(`
      SELECT r.id, r.hazard_type, r.severity, r.status, r.created_at, u.name AS user_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC LIMIT 10
    `);

    const reportsByDay = await pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM reports
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day
    `);

    const reportsBySeverity = await pool.query(`
      SELECT severity, COUNT(*) AS count FROM reports GROUP BY severity
    `);

    res.json({
      stats: {
        total_users: parseInt(users.rows[0].count),
        total_reports: parseInt(reports.rows[0].count),
        resolved_reports: parseInt(resolved.rows[0].count),
        critical_reports: parseInt(critical.rows[0].count),
      },
      recent_reports: recentReports.rows,
      reports_by_day: reportsByDay.rows,
      reports_by_severity: reportsBySeverity.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── ALL USERS ──────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.is_verified, u.created_at,
             COUNT(r.id)::int AS report_count
      FROM users u
      LEFT JOIN reports r ON r.user_id = u.id
    `;
    const params = [];

    if (search) {
      query += ` WHERE u.name ILIKE $1 OR u.email ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const total = await pool.query('SELECT COUNT(*) FROM users');

    res.json({ users: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// ── DELETE USER ────────────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res, next) => {
  // Server-side self-delete guard — frontend validation alone is not sufficient.
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(403).json({ message: 'Cannot delete your own admin account.' });
  }

  let client;
  try {
    // All three writes are wrapped in a single transaction: if the audit-log
    // insert fails, the user deletion and report anonymization are rolled back.
    client = await pool.connect();
    await client.query('BEGIN');

    const target = await client.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.params.id]
    );
    await client.query('UPDATE reports SET user_id = NULL WHERE user_id = $1', [req.params.id]);
    await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await client.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, old_value)
       VALUES ($1, $2, 'delete_user', 'user', $3, $4)`,
      [req.user.id, req.user.email, req.params.id, JSON.stringify(target.rows[0] || {})]
    );

    await client.query('COMMIT');
    res.json({ message: 'User deleted ✅' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── CHANGE USER ROLE ───────────────────────────────────────────────────────────
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    const before = await pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, old_value, new_value)
       VALUES ($1, $2, 'change_user_role', 'user', $3, $4, $5)`,
      [req.user.id, req.user.email, req.params.id,
       JSON.stringify({ role: before.rows[0]?.role }),
       JSON.stringify({ role })]
    );
    res.json({ message: 'Role updated ✅' });
  } catch (err) {
    next(err);
  }
});

// ── ALL REPORTS ────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res, next) => {
  try {
    const { status, severity, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (status) { params.push(status); conditions.push(`r.status = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`r.severity = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`r.hazard_type ILIKE $${params.length} OR r.description ILIKE $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT r.*, u.name AS user_name, u.email AS user_email
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const total = await pool.query(`SELECT COUNT(*) FROM reports r ${where}`, params);

    res.json({ reports: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// ── DELETED REPORTS (24-hour admin review window) ─────────────────────────────
router.get('/reports/deleted', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT dr.*, u.name AS reporter_name, u.email AS reporter_email
      FROM deleted_reports dr
      LEFT JOIN users u ON dr.user_id = u.id
      WHERE dr.deleted_at > NOW() - INTERVAL '24 hours'
      ORDER BY dr.deleted_at DESC
    `)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// ── UPDATE REPORT STATUS (ADMIN) ───────────────────────────────────────────────
router.put('/reports/:id/status', async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['active', 'under_review', 'under_construction', 'being_monitored', 'partially_fixed', 'resolved'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const before = await pool.query('SELECT status FROM reports WHERE id = $1', [req.params.id]);
    const oldStatus = before.rows[0]?.status;

    await pool.query(
      `UPDATE reports SET status = $1 WHERE id = $2`,
      [status, req.params.id]
    );

    await pool.query(
      `INSERT INTO report_status_history (report_id, new_status, user_role, previous_status)
       VALUES ($1, $2, 'admin', $3)`,
      [req.params.id, status, oldStatus]
    );

    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, old_value, new_value)
       VALUES ($1, $2, 'update_report_status', 'report', $3, $4, $5)`,
      [req.user.id, req.user.email, req.params.id,
       JSON.stringify({ status: oldStatus }),
       JSON.stringify({ status })]
    );

    res.json({ message: 'Status updated ✅' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE REPORT ──────────────────────────────────────────────────────────────
router.delete('/reports/:id', async (req, res, next) => {
  try {
    const target = await pool.query('SELECT id, hazard_type, status, severity FROM reports WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM report_status_history WHERE report_id = $1', [req.params.id]);
    await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    try { await redis.del('reports:all'); } catch {}
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, old_value)
       VALUES ($1, $2, 'delete_report', 'report', $3, $4)`,
      [req.user.id, req.user.email, req.params.id, JSON.stringify(target.rows[0] || {})]
    );
    res.json({ message: 'Report deleted ✅' });
  } catch (err) {
    next(err);
  }
});

// ── ARCHIVE REPORT ────────────────────────────────────────────────────────────
router.post('/reports/:id/archive', async (req, res, next) => {
  try {
    const target = await pool.query(
      'SELECT id, hazard_type, status, archived_at FROM reports WHERE id = $1',
      [req.params.id]
    );
    if (target.rows.length === 0)
      return res.status(404).json({ message: 'Report not found' });
    if (target.rows[0].archived_at)
      return res.status(409).json({ message: 'Report is already archived' });

    await pool.query('UPDATE reports SET archived_at = NOW() WHERE id = $1', [req.params.id]);
    try { await redis.del('reports:all'); } catch {}
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, old_value, new_value)
       VALUES ($1, $2, 'archive_report', 'report', $3, $4, $5)`,
      [req.user.id, req.user.email, req.params.id,
       JSON.stringify({ archived_at: null }),
       JSON.stringify({ archived_at: new Date().toISOString() })]
    );
    res.json({ message: 'Report archived ✅' });
  } catch (err) {
    next(err);
  }
});

// ── UNARCHIVE REPORT ──────────────────────────────────────────────────────────
router.post('/reports/:id/unarchive', async (req, res, next) => {
  try {
    const target = await pool.query(
      'SELECT id, hazard_type, status, archived_at FROM reports WHERE id = $1',
      [req.params.id]
    );
    if (target.rows.length === 0)
      return res.status(404).json({ message: 'Report not found' });
    if (!target.rows[0].archived_at)
      return res.status(409).json({ message: 'Report is not archived' });

    const previousArchivedAt = target.rows[0].archived_at;
    await pool.query('UPDATE reports SET archived_at = NULL WHERE id = $1', [req.params.id]);
    try { await redis.del('reports:all'); } catch {}
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, target_id, old_value, new_value)
       VALUES ($1, $2, 'unarchive_report', 'report', $3, $4, $5)`,
      [req.user.id, req.user.email, req.params.id,
       JSON.stringify({ archived_at: previousArchivedAt }),
       JSON.stringify({ archived_at: null })]
    );
    res.json({ message: 'Report unarchived ✅' });
  } catch (err) {
    next(err);
  }
});

// ── CHART-1: ANALYTICS DATA (30 days) ─────────────────────────────────────────
router.get('/analytics', async (req, res, next) => {
  try {
    const [byDay, byCategory, bySeverity, avgResolution] = await Promise.all([
      pool.query(`
        SELECT TO_CHAR(gs.day::date, 'Mon DD') AS label,
               COALESCE(COUNT(r.id), 0)::int AS count
        FROM generate_series(
          NOW() - INTERVAL '29 days', NOW(), INTERVAL '1 day'
        ) AS gs(day)
        LEFT JOIN reports r
          ON DATE(r.created_at) = gs.day::date
        GROUP BY gs.day ORDER BY gs.day
      `),
      pool.query(`
        SELECT hazard_type AS label, COUNT(*)::int AS count
        FROM reports GROUP BY hazard_type ORDER BY count DESC
      `),
      pool.query(`
        SELECT severity AS label, COUNT(*)::int AS count
        FROM reports GROUP BY severity
      `),
      pool.query(`
        SELECT ROUND(AVG(
          EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
        )::numeric, 1) AS hours
        FROM reports WHERE status = 'resolved' AND resolved_at IS NOT NULL
      `),
    ]);

    res.json({
      by_day: byDay.rows,
      by_category: byCategory.rows,
      by_severity: bySeverity.rows,
      avg_resolution_hours: parseFloat(avgResolution.rows[0]?.hours ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

// ── BROADCAST ALERT ────────────────────────────────────────────────────────────
router.post('/broadcast', validate(broadcastSchema), async (req, res, next) => {
  try {
    const { title, message, severity } = req.body;

    await pool.query(
      `INSERT INTO notifications (title, message, severity, type, created_at)
       VALUES ($1, $2, $3, 'broadcast', NOW())`,
      [title, message, severity || 'medium']
    );

    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_type, new_value)
       VALUES ($1, $2, 'broadcast_alert', 'notification', $3)`,
      [req.user.id, req.user.email, JSON.stringify({ title, severity: severity || 'medium' })]
    );

    // NOTIF4 — emit real-time event so Navbar increments unread badge instantly
    const io = req.app.get('io');
    if (io) io.emit('new-notification', { title, severity: severity || 'medium' });

    res.json({ message: 'Alert broadcast sent ✅' });
  } catch (err) {
    next(err);
  }
});

// ── AUDIT LOG ──────────────────────────────────────────────────────────────────
router.get('/audit-log', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT id, admin_id, admin_email, action, target_type, target_id,
              old_value, new_value, created_at
       FROM admin_audit_log
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query('SELECT COUNT(*) FROM admin_audit_log');
    res.json({ entries: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;