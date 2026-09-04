const express = require('express');
const pool = require('../db');

const router = express.Router();

// LAND-2 — Public stats for landing page, no auth required
router.get('/stats', async (req, res, next) => {
  try {
    const [reports, users, resolved, areas] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM reports'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM reports WHERE status = 'resolved'"),
      pool.query(`
        SELECT COUNT(DISTINCT
          CONCAT(ROUND(latitude::numeric, 1), ',', ROUND(longitude::numeric, 1))
        ) AS count FROM reports WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `),
    ]);

    res.json({
      total_reports: parseInt(reports.rows[0].count),
      total_users: parseInt(users.rows[0].count),
      resolved_count: parseInt(resolved.rows[0].count),
      areas_covered: parseInt(areas.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
