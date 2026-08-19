const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET notifications — return rows targeted to this user OR global (user_id IS NULL)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications
      WHERE deleted_at IS NULL
        AND (user_id = $1 OR user_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 30
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unread count — only count rows visible to this user
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const lastRead = await pool.query(
      `SELECT read_at FROM notification_reads WHERE user_id = $1`,
      [req.user.id]
    );
    const since = lastRead.rows[0]?.read_at || new Date(0);

    const count = await pool.query(
      `SELECT COUNT(*) FROM notifications
       WHERE created_at > $1
         AND deleted_at IS NULL
         AND (user_id = $2 OR user_id IS NULL)`,
      [since, req.user.id]
    );

    res.json({ count: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT mark all read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO notification_reads (user_id, read_at)
       VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET read_at = NOW()`,
      [req.user.id]
    );
    res.json({ message: 'Marked as read ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clear-all — soft-delete all rows this user can see (their own + global)
// MUST be declared before /:id so Express doesn't treat "clear-all" as an :id value
router.delete('/clear-all', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET deleted_at = NOW()
       WHERE deleted_at IS NULL
         AND (user_id = $1 OR user_id IS NULL)
       RETURNING id`,
      [req.user.id]
    );
    res.json({
      message: `Cleared ${result.rowCount} notification(s) ✅`,
      count: result.rowCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — soft-delete a single notification this user can see
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET deleted_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL
         AND (user_id = $2 OR user_id IS NULL)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
