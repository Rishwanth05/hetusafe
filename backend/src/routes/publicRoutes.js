const express = require('express');
const pool = require('../db');
const { getCache, setCache } = require('../config/redis');

const router = express.Router();

router.get('/stats', async (req, res, next) => {
  try {
    const cached = await getCache('public:stats');
    if (cached) return res.json(cached);

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

    const payload = {
      total_reports: parseInt(reports.rows[0].count),
      total_users: parseInt(users.rows[0].count),
      resolved_count: parseInt(resolved.rows[0].count),
      areas_covered: parseInt(areas.rows[0].count),
    };

    await setCache('public:stats', payload, 60);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
