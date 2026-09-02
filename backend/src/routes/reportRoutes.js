const express = require("express");
const pool = require("../db");
const multer = require("multer");
const xss = require("xss");
const { sendPushNotification } = require("../config/firebase");
const redis = require("../config/redis");
const { getCache, setCache } = require("../config/redis");
const { verifyToken } = require('../middleware/auth');
const sharp = require('sharp');
const { z } = require('zod');

const router = express.Router();

// ── Validation middleware (same pattern as authRoutes.js) ─────────────────────
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    req.body = result.data;
    next();
  };
}

// Shared coordinate fields. /create sends multipart (lat/lng arrive as strings),
// so z.coerce.number() is used for both routes for consistency.
const latField = z.coerce
  .number({ message: 'Latitude must be a number' })
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');
const lngField = z.coerce
  .number({ message: 'Longitude must be a number' })
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

// hazard_type is validated as a bounded string, not a static enum, because
// categories are stored in the DB and can be extended by admins at runtime.
const hazardTypeField = z
  .string()
  .min(1, 'Hazard type is required')
  .max(100, 'Hazard type must be 100 characters or less');

// user_id is deliberately absent — the handler now reads req.user.id from the
// verified JWT instead. Zod strips any client-supplied user_id from req.body.
const createReportSchema = z.object({
  hazard_type: hazardTypeField,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be 1000 characters or less'),
  latitude: latField,
  longitude: lngField,
  custom_description: z.string().max(100).optional(),
  location_method: z.string().max(20).optional(),
});

const checkDuplicateSchema = z.object({
  latitude: latField,
  longitude: lngField,
  hazard_type: hazardTypeField,
});

const nearbyQuerySchema = z.object({
  lat:       latField,
  lng:       lngField,
  radius_km: z.coerce.number().positive('radius_km must be positive').max(100, 'radius_km must be at most 100').default(10),
  limit:     z.coerce.number().int('limit must be an integer').positive('limit must be positive').max(20, 'limit must be at most 20').default(5),
});

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
})

// Allowlist checked against magic bytes, not the client-supplied Content-Type header.
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Buffer in memory so we can inspect bytes before anything reaches S3.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Verifies real file type from magic bytes, re-encodes to WebP via sharp
// (strips EXIF/GPS metadata and embedded payloads), then uploads to S3.
// Throws with err.status = 400 on invalid type; propagates S3/sharp errors otherwise.
async function processAndUploadImage(buffer) {
  // file-type is ESM-only; dynamic import works from CJS on Node 18+.
  const { fileTypeFromBuffer } = await import('file-type')
  const detected = await fileTypeFromBuffer(buffer)

  if (!detected || !ALLOWED_IMAGE_MIME_TYPES.has(detected.mime)) {
    const err = new Error('Only JPEG, PNG and WebP images are allowed')
    err.status = 400
    throw err
  }

  // Re-encode to WebP — strips all metadata and normalises output format.
  // quality: 80 matches typical JPEG defaults while producing smaller files.
  // Buffer.from() copies bytes out of sharp's WASM SharedArrayBuffer heap into a
  // plain ArrayBuffer — required because AWS SDK v3 (@smithy/util-buffer-from)
  // explicitly rejects SharedArrayBuffer when serialising the S3 request body.
  const safeBuffer = Buffer.from(await sharp(buffer).webp({ quality: 80 }).toBuffer())

  const key = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: safeBuffer,
    ContentType: 'image/webp',
  }))

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}

// TRUST-1 — Recalculate trust score and badge tier
async function updateTrustScore(pool, userId, delta) {
  const result = await pool.query(
    `UPDATE users
     SET trust_score = GREATEST(0, LEAST(1000, trust_score + $1))
     WHERE id = $2
     RETURNING trust_score`,
    [delta, userId]
  )
  const score = result.rows[0]?.trust_score || 100
  const tier =
    score >= 800 ? 'Hero' :
    score >= 600 ? 'Guardian' :
    score >= 400 ? 'Trusted' :
    score >= 200 ? 'Reporter' : 'Newcomer'
  await pool.query(`UPDATE users SET badge_tier = $1 WHERE id = $2`, [tier, userId])
  return { score, tier }
}

async function dailyReportLimit(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) return next()
    const today = new Date().toISOString().slice(0, 10)
    const key = `daily_reports:${userId}:${today}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 86400)
    if (count > 5) {
      return res.status(429).json({
        message: 'Daily report limit reached. You can submit up to 5 reports per day.'
      })
    }
    next()
  } catch (err) {
    next()
  }
}

router.get("/all", verifyToken, async (req, res) => {
  try {
    try {
      const cached = await getCache('reports:all');
      if (cached) return res.json(cached);
    } catch {}

    const result = await pool.query(`
      SELECT r.*, u.name, u.trust_score, u.badge_tier,
             rsh.proof_image_url AS proof_url
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT proof_image_url
        FROM report_status_history
        WHERE report_id = r.id AND proof_image_url IS NOT NULL
        ORDER BY changed_at DESC
        LIMIT 1
      ) rsh ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE vote = 'confirmed') -
          COUNT(*) FILTER (WHERE vote = 'disputed') AS net
        FROM resolution_votes
        WHERE report_id = r.id
      ) v ON true
      WHERE r.archived_at IS NULL
        AND NOT (
          r.status = 'resolved'
          AND r.resolved_at < NOW() - INTERVAL '24 hours'
          AND v.net > 0
        )
      ORDER BY r.created_at DESC
    `);

    try {
      await setCache('reports:all', result.rows, 30);
    } catch {}

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/nearby — distance-sorted feed for the Home page "Near You" widget.
// Reuses Pattern B (Haversine in km) from /check-duplicate.
// Applies the same archived_at + auto-hide rules as GET /all.
router.get('/nearby', verifyToken, async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { lat, lng, radius_km, limit } = parsed.data;

  try {
    const { rows } = await pool.query(`
      SELECT sub.*, u.name, u.trust_score, u.badge_tier,
             ROUND(sub.distance_km::numeric, 2) AS distance_km
      FROM (
        SELECT r.*,
          (6371 * acos(LEAST(1,
            cos(radians($1)) * cos(radians(r.latitude)) *
            cos(radians(r.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(r.latitude))
          ))) AS distance_km
        FROM reports r
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE vote = 'confirmed') -
            COUNT(*) FILTER (WHERE vote = 'disputed') AS net
          FROM resolution_votes
          WHERE report_id = r.id
        ) v ON true
        WHERE r.archived_at IS NULL
          AND NOT (
            r.status = 'resolved'
            AND r.resolved_at < NOW() - INTERVAL '24 hours'
            AND v.net > 0
          )
      ) sub
      LEFT JOIN users u ON sub.user_id = u.id
      WHERE sub.distance_km <= $3
      ORDER BY sub.distance_km ASC
      LIMIT $4
    `, [lat, lng, radius_km, limit]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TRUST-1 — Get user trust score
router.get('/trust/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT trust_score, badge_tier FROM users WHERE id = $1`,
      [req.params.userId]
    )
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post("/create", verifyToken, dailyReportLimit, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Please upload a photo below 5MB.' })
      }
      return res.status(400).json({ error: err.message })
    }
    next()
  })
}, validate(createReportSchema), async (req, res) => {
  try {
    const {
      hazard_type, severity, description,
      custom_description, latitude, longitude, location_method,
    } = req.body;

    // user_id now comes from the verified JWT, not the request body.
    const userId = req.user.id;

    if (hazard_type === 'Others' && !custom_description?.trim()) {
      return res.status(400).json({ message: "Please describe the hazard type" });
    }

    const clean_hazard_type = xss(hazard_type.trim());
    const clean_description = xss(description.trim());
    const clean_custom_description = custom_description ? xss(custom_description.trim()) : null;

    let image_url = null
    if (req.file) {
      try {
        image_url = await processAndUploadImage(req.file.buffer)
      } catch (err) {
        return res.status(err.status || 400).json({ error: err.message })
      }
    }

    const result = await pool.query(
      `INSERT INTO reports
        (user_id, hazard_type, severity, description, custom_description, latitude, longitude, location_method, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, clean_hazard_type, severity, clean_description, clean_custom_description,
       latitude, longitude, location_method || "gps", image_url]
    );

    const newReport = result.rows[0]

    try { await redis.del('reports:all'); } catch {}

    // TRUST-1 — +10 points for submitting a report
    await updateTrustScore(pool, userId, 10)

    // Update reporter's last known location so future FCM broadcasts can radius-filter them
    await pool.query(
      `UPDATE users SET last_lat = $1, last_lng = $2 WHERE id = $3`,
      [latitude, longitude, userId]
    );

    const io = req.app.get('io')
    if (io) {
      io.emit('new-report', { ...newReport, name: req.body.reporter_name || 'Anonymous' })
    }

    // Persist notification to DB so bell icon picks it up via polling
    pool.query(
      `INSERT INTO notifications (title, message, severity, type, report_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        `🚨 ${clean_hazard_type}`,
        `${severity} hazard reported nearby`,
        severity,
        'proximity_alert',
        newReport.id,
      ]
    ).catch(err => console.error('Notification insert failed:', err.message))

    // FCM — notify users within 30 miles of the hazard (fire and forget)
    // Uses Haversine formula (3959 = Earth radius in miles).
    // LEAST(1, ...) guards against floating-point rounding above 1 that would make acos return NaN.
    // Users with no last_lat/last_lng (never submitted a report) are excluded.
    pool.query(
      `SELECT fcm_token
       FROM users
       WHERE fcm_token IS NOT NULL
         AND last_lat IS NOT NULL
         AND last_lng IS NOT NULL
         AND id != $3
         AND (3959 * acos(LEAST(1,
               cos(radians($1)) * cos(radians(last_lat)) *
               cos(radians(last_lng) - radians($2)) +
               sin(radians($1)) * sin(radians(last_lat))
             ))) <= 30`,
      [latitude, longitude, userId]
    )
      .then(({ rows }) => {
        if (rows.length === 0) return;
        const notifTitle = `🚨 ${clean_hazard_type}`;
        const notifBody = `${severity} hazard reported within 30 miles of you`;
        rows.forEach(({ fcm_token }) =>
          sendPushNotification(fcm_token, notifTitle, notifBody, {
            type: 'new_report',
            reportId: String(newReport.id),
          })
        );
      })
      .catch((err) => console.error('FCM broadcast query failed:', err.message));

    res.status(201).json({ message: "Report created ✅", report: newReport });
  } catch (err) {
    console.error('Report create error:', err)
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.post("/resolve", (req, res, next) => {
  upload.single('proof')(req, res, (err) => {
    if (err) {
      console.error('Multer error (resolve):', err)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Please upload a photo below 5MB.' })
      }
      return res.status(400).json({ error: err.message })
    }
    next()
  })
}, async (req, res) => {
  try {
    const { report_id } = req.body;

    if (!report_id)
      return res.status(400).json({ message: "report_id is required" });

    if (!req.file)
      return res.status(400).json({ message: "Camera proof image is required to resolve a report" });

    let proof_url
    try {
      proof_url = await processAndUploadImage(req.file.buffer)
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message })
    }

    await pool.query(
      `UPDATE reports SET status = 'resolved', resolved_at = NOW() WHERE id = $1`,
      [report_id]
    );

    await pool.query(
      `INSERT INTO report_status_history
        (report_id, new_status, previous_status, user_role, proof_image_url)
       VALUES ($1, 'resolved', 'active', 'user', $2)`,
      [report_id, proof_url]
    );
    try { await redis.del('reports:all'); } catch {}

    // TRUST-1 — +25 points for resolving a report
    const reportOwner = await pool.query(
      'SELECT user_id, hazard_type FROM reports WHERE id = $1',
      [report_id]
    )
    if (reportOwner.rows[0]?.user_id) {
      await updateTrustScore(pool, reportOwner.rows[0].user_id, 25)
    }

    // Notify the original reporter that their report has been resolved.
    // user_id targets only the report owner; other users do not see this notification.
    const ownerId   = reportOwner.rows[0]?.user_id   || null
    const hazardType = reportOwner.rows[0]?.hazard_type || 'Hazard'
    if (ownerId) {
      pool.query(
        `INSERT INTO notifications (title, message, severity, type, user_id, report_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          `✅ Your ${hazardType} report was resolved`,
          `The ${hazardType} you reported has been marked as resolved by a community member`,
          'low',
          'resolved',
          ownerId,
          report_id,
        ]
      ).catch(err => console.error('Resolution notification insert failed:', err.message))

      // FCM — push the reporter so they get an OS notification even when the app is closed
      pool.query(
        'SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL',
        [ownerId]
      ).then(({ rows }) => {
        if (!rows[0]?.fcm_token) return
        sendPushNotification(
          rows[0].fcm_token,
          `✅ Your ${hazardType} report was resolved`,
          `The ${hazardType} you reported has been marked as resolved by a community member`,
          { type: 'resolved', reportId: String(report_id) }
        )
      }).catch(err => console.error('Resolve FCM query failed:', err.message))
    }

    res.json({ message: "Report resolved ✅", proofUrl: proof_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DUP1 — Duplicate detection: check 50m radius + same category + 24hr window
router.post("/check-duplicate", validate(checkDuplicateSchema), async (req, res) => {
  try {
    const { latitude, longitude, hazard_type } = req.body

    const result = await pool.query(
      `SELECT id, hazard_type, description, created_at, distance_meters
       FROM (
         SELECT id, hazard_type, description, created_at,
           (6371000 * acos(LEAST(1,
             cos(radians($1)) * cos(radians(latitude)) *
             cos(radians(longitude) - radians($2)) +
             sin(radians($1)) * sin(radians(latitude))
           ))) AS distance_meters
         FROM reports
         WHERE hazard_type = $3
           AND created_at > NOW() - INTERVAL '24 hours'
           AND latitude IS NOT NULL
           AND longitude IS NOT NULL
       ) sub
       WHERE distance_meters < 50
       ORDER BY distance_meters ASC
       LIMIT 1`,
      [latitude, longitude, hazard_type]
    )

    if (result.rows.length > 0)
      return res.json({ isDuplicate: true, existing: result.rows[0] })

    res.json({ isDuplicate: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

// DELETE /reports/:id — owner self-delete within the 6-hour window
router.delete('/:id', verifyToken, async (req, res) => {
  const reportId = parseInt(req.params.id, 10)
  if (isNaN(reportId)) return res.status(400).json({ message: 'Invalid report ID' })

  // Read-only checks before acquiring a transaction client
  const { rows } = await pool.query('SELECT * FROM reports WHERE id = $1', [reportId])
  if (rows.length === 0) return res.status(404).json({ message: 'Report not found' })

  const report = rows[0]

  if (report.user_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own reports' })
  }

  const ageMs = Date.now() - new Date(report.created_at).getTime()
  if (ageMs > 6 * 60 * 60 * 1000) {
    return res.status(403).json({ message: 'Reports can only be deleted within 6 hours of submission' })
  }

  let dbClient
  try {
    dbClient = await pool.connect()
    await dbClient.query('BEGIN')

    // Archive the report before removing it
    await dbClient.query(
      `INSERT INTO deleted_reports
         (id, user_id, title, hazard_type, custom_description, severity, description,
          latitude, longitude, location_method, image_url, status, confirmation_count,
          flag_count, archived_at, created_at, resolved_at, deleted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [report.id, report.user_id, report.title, report.hazard_type,
       report.custom_description, report.severity, report.description,
       report.latitude, report.longitude, report.location_method,
       report.image_url, report.status, report.confirmation_count,
       report.flag_count, report.archived_at, report.created_at,
       report.resolved_at, req.user.id]
    )

    // Remove FK-dependent rows first (no CASCADE defined on these FKs)
    await dbClient.query('DELETE FROM resolution_votes WHERE report_id = $1', [reportId])
    await dbClient.query('DELETE FROM report_status_history WHERE report_id = $1', [reportId])
    await dbClient.query('DELETE FROM reports WHERE id = $1', [reportId])

    // Reverse the +10 trust credit from submission, flooring at 0
    const scoreResult = await dbClient.query(
      `UPDATE users SET trust_score = GREATEST(0, trust_score - 10) WHERE id = $1 RETURNING trust_score`,
      [req.user.id]
    )
    const score = scoreResult.rows[0]?.trust_score ?? 0
    const tier =
      score >= 800 ? 'Hero' :
      score >= 600 ? 'Guardian' :
      score >= 400 ? 'Trusted' :
      score >= 200 ? 'Reporter' : 'Newcomer'
    await dbClient.query('UPDATE users SET badge_tier = $1 WHERE id = $2', [tier, req.user.id])

    await dbClient.query('COMMIT')
    try { await redis.del('reports:all') } catch {}

    res.json({ message: 'Report deleted' })
  } catch (err) {
    if (dbClient) await dbClient.query('ROLLBACK').catch(() => {})
    res.status(500).json({ error: err.message })
  } finally {
    if (dbClient) dbClient.release()
  }
})

// GET /reports/:id/votes — fetch vote counts + user's own vote
router.get('/:id/votes', verifyToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;

    const counts = await pool.query(
      `SELECT vote, COUNT(*) as count FROM resolution_votes WHERE report_id = $1 GROUP BY vote`,
      [reportId]
    );

    const userVote = await pool.query(
      `SELECT vote FROM resolution_votes WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId]
    );

    const result = { confirmed: 0, disputed: 0, userVote: null };
    counts.rows.forEach(r => { result[r.vote] = parseInt(r.count); });
    if (userVote.rows.length > 0) result.userVote = userVote.rows[0].vote;

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reports/:id/vote — cast or change a vote
router.post('/:id/vote', verifyToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    const { vote } = req.body;

    if (!['confirmed', 'disputed'].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    await pool.query(
      `INSERT INTO resolution_votes (user_id, report_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, report_id) DO UPDATE SET vote = $3`,
      [userId, reportId, vote]
    );

    const counts = await pool.query(
      `SELECT vote, COUNT(*) as count FROM resolution_votes WHERE report_id = $1 GROUP BY vote`,
      [reportId]
    );

    const result = { confirmed: 0, disputed: 0, userVote: vote };
    counts.rows.forEach(r => { result[r.vote] = parseInt(r.count); });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
