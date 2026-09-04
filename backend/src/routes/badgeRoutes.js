const express = require('express')
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const router = express.Router()

const BADGE_DEFS = [
  {
    id: 'first_report',
    name: 'First Report',
    emoji: '🏅',
    description: 'Submitted your first hazard report',
    check: (stats) => stats.reports_submitted >= 1,
  },
  {
    id: 'ten_reports',
    name: '10 Reports',
    emoji: '🔟',
    description: 'Submitted 10 or more hazard reports',
    check: (stats) => stats.reports_submitted >= 10,
  },
  {
    id: 'resolver',
    name: 'Resolver',
    emoji: '✅',
    description: 'Resolved at least one hazard report',
    check: (stats) => stats.reports_resolved >= 1,
  },
  {
    id: 'community_hero',
    name: 'Community Hero',
    emoji: '🦸',
    description: 'Submitted 5+ reports AND resolved at least one',
    check: (stats) => stats.reports_submitted >= 5 && stats.reports_resolved >= 1,
  },
]

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id
    const submittedRes = await pool.query('SELECT COUNT(*) FROM reports WHERE user_id = $1', [userId])
    const resolvedRes = await pool.query(
      `SELECT COUNT(*) FROM reports r
       JOIN report_status_history h ON h.report_id = r.id
       WHERE r.user_id = $1 AND h.new_status = 'resolved'`,
      [userId]
    )
    const stats = {
      reports_submitted: parseInt(submittedRes.rows[0].count, 10),
      reports_resolved: parseInt(resolvedRes.rows[0].count, 10),
    }
    const badges = BADGE_DEFS.map((b) => ({
      ...b,
      earned: b.check(stats),
      check: undefined,
    }))
    res.json({ stats, badges })
  } catch (err) {
    next(err)
  }
})

router.get('/leaderboard', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        COUNT(r.id)::int AS reports_submitted,
        COUNT(h.id)::int AS reports_resolved,
        (COUNT(r.id) * 10 + COUNT(h.id) * 25)::int AS score
      FROM users u
      LEFT JOIN reports r ON r.user_id = u.id
      LEFT JOIN report_status_history h
        ON h.report_id = r.id AND h.new_status = 'resolved'
      GROUP BY u.id, u.name
      HAVING COUNT(r.id) > 0
      ORDER BY score DESC
      LIMIT 20
    `)
    const rows = result.rows.map((row) => {
      const stats = {
        reports_submitted: row.reports_submitted,
        reports_resolved: row.reports_resolved,
      }
      const badge_count = BADGE_DEFS.filter((b) => b.check(stats)).length
      const top_badge = BADGE_DEFS.filter((b) => b.check(stats)).slice(-1)[0]
      return { ...row, badge_count, top_badge: top_badge ? top_badge.emoji : null }
    })
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

module.exports = router