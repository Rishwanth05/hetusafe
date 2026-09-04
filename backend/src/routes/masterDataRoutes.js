const express = require('express');
const pool = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { z } = require('zod');
const validate = require('../middleware/validate');

const router = express.Router();

// icon is an emoji field — max 20 chars covers multi-codepoint ZWJ sequences.
const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  icon: z.string().max(20, 'Icon must be 20 characters or less').optional(),
});

// ── Public read endpoints ──────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM hazard_categories WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/severities', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM severity_levels WHERE is_active = true ORDER BY sort_order'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/statuses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM report_statuses WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin-only write endpoints ─────────────────────────────────────────────────

router.post('/categories', verifyToken, requireAdmin, validate(categorySchema), async (req, res) => {
  try {
    const { name, icon } = req.body;
    const result = await pool.query(
      'INSERT INTO hazard_categories (name, icon) VALUES ($1, $2) RETURNING *',
      [name.trim(), icon?.trim() || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/categories/:id/toggle', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE hazard_categories SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
