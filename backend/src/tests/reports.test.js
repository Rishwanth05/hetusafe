'use strict';

const request = require('supertest');
const app = require('../app');
const pool = require('../db');
const redis = require('../config/redis');
const sharp = require('sharp');

// Prevent real emails being sent during the auth helpers below
jest.mock('../utils/email', () => ({
  generateOTP: jest.requireActual('../utils/email').generateOTP,
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const REPORTER = { name: 'Reporter', email: 'reporter@example.com', password: 'ValidPass1!' };

// All string values — multipart fields arrive as strings; zod coerces lat/lng.
const BASE_REPORT = {
  hazard_type: 'Pothole',
  severity: 'medium',
  description: 'Large pothole in the road',
  latitude: '12.9716',
  longitude: '77.5946',
};

// ── Shared state ──────────────────────────────────────────────────────────────

let agent;
let csrfToken;
let testJpegBuffer; // minimal 10×10 red JPEG — valid magic bytes, processable by sharp

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createVerifiedUser(user = REPORTER) {
  await agent
    .post('/api/v1/auth/signup')
    .set('X-CSRF-Token', csrfToken)
    .send(user);

  const { rows } = await pool.query(
    "SELECT code FROM otp_codes WHERE email = $1 AND purpose = 'verify'",
    [user.email]
  );
  const res = await agent
    .post('/api/v1/auth/verify-email')
    .set('X-CSRF-Token', csrfToken)
    .send({ email: user.email, otp: rows[0].code });

  return { accessToken: res.body.accessToken, userId: res.body.user.id };
}

// Returns a supertest Request with all BASE_REPORT fields already set.
// Caller can chain .attach() to add an image, or await directly for no-image.
function postReport(accessToken) {
  const req = agent
    .post('/api/v1/reports/create')
    .set('Authorization', `Bearer ${accessToken}`)
    .set('X-CSRF-Token', csrfToken);
  Object.entries(BASE_REPORT).forEach(([k, v]) => req.field(k, v));
  return req;
}

// Sends POST /resolve with a valid proof image for the given report.
function resolveReport(reportId) {
  return agent
    .post('/api/v1/reports/resolve')
    .set('X-CSRF-Token', csrfToken)
    .field('report_id', String(reportId))
    .attach('proof', testJpegBuffer, { filename: 'proof.jpg', contentType: 'image/jpeg' });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Build a minimal valid JPEG once — sharp + file-type both accept it
  testJpegBuffer = await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .jpeg()
    .toBuffer();

  agent = request.agent(app);
  const res = await agent.get('/api/csrf-token');
  csrfToken = res.body.csrfToken;
  expect(csrfToken).toBeTruthy();
});

beforeEach(async () => {
  // Flush Redis so rate-limit counters reset between tests
  await redis.flushdb();
  await pool.query(`
    TRUNCATE users, otp_codes, refresh_tokens, password_reset_tokens,
             password_history, account_deletions, reports, notifications,
             notification_reads, report_status_history, resolution_votes
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

// ── Report creation ───────────────────────────────────────────────────────────

describe('POST /api/v1/reports/create', () => {
  let accessToken;
  let userId;

  // Runs after the top-level beforeEach (which wipes the DB), so each test
  // in this describe starts with exactly one freshly-verified user.
  beforeEach(async () => {
    ({ accessToken, userId } = await createVerifiedUser());
  });

  test('valid report + JPEG image returns 201 with image_url set', async () => {
    const res = await postReport(accessToken).attach('image', testJpegBuffer, {
      filename: 'test.jpg',
      contentType: 'image/jpeg',
    });

    expect(res.status).toBe(201);
    expect(res.body.report.hazard_type).toBe(BASE_REPORT.hazard_type);
    expect(res.body.report.severity).toBe(BASE_REPORT.severity);
    expect(res.body.report.user_id).toBe(userId);
    // URL is built by processAndUploadImage using env vars (S3 send is mocked)
    expect(res.body.report.image_url).toMatch(/\.amazonaws\.com\//);
  });

  test('valid report without image returns 201 with image_url null', async () => {
    const res = await postReport(accessToken);

    expect(res.status).toBe(201);
    expect(res.body.report.image_url).toBeNull();
  });

  test('file with wrong magic bytes (disguised as .jpg) returns 400', async () => {
    // file-type inspects actual bytes, not the client-supplied Content-Type header
    const fakeBuffer = Buffer.from('This is plain text, not an image');

    const res = await postReport(accessToken).attach('image', fakeBuffer, {
      filename: 'fake.jpg',
      contentType: 'image/jpeg',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jpeg|png|webp/i);
  });

  test('unauthenticated request returns 401', async () => {
    const req = agent.post('/api/v1/reports/create').set('X-CSRF-Token', csrfToken);
    Object.entries(BASE_REPORT).forEach(([k, v]) => req.field(k, v));
    const res = await req;

    expect(res.status).toBe(401);
  });

  test('creating a report awards +10 trust score to the reporter', async () => {
    const {
      rows: [{ trust_score: before }],
    } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [userId]);

    await postReport(accessToken);

    const {
      rows: [{ trust_score: after }],
    } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [userId]);

    expect(after).toBe(before + 10);
  });
});

// ── Fetch via /all ────────────────────────────────────────────────────────────

describe('GET /api/v1/reports/all', () => {
  test('created report appears in the list with correct fields', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    const createRes = await postReport(accessToken);
    expect(createRes.status).toBe(201);

    const reportId = createRes.body.report.id;

    const allRes = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(allRes.status).toBe(200);

    const found = allRes.body.find((r) => r.id === reportId);
    expect(found).toBeDefined();
    expect(found.hazard_type).toBe(BASE_REPORT.hazard_type);
    expect(found.severity).toBe(BASE_REPORT.severity);
    expect(found.user_id).toBe(userId);
  });

  test('unauthenticated GET /all returns 401', async () => {
    const res = await agent.get('/api/v1/reports/all');
    expect(res.status).toBe(401);
  });
});

// ── Vote (confirmed / disputed) ───────────────────────────────────────────────

describe('POST /api/v1/reports/:id/vote', () => {
  test('confirmed vote is recorded and counts reflect it', async () => {
    const { accessToken } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    const res = await agent
      .post(`/api/v1/reports/${reportId}/vote`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ vote: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(1);
    expect(res.body.disputed).toBe(0);
    expect(res.body.userVote).toBe('confirmed');
  });

  test('changing vote from confirmed to disputed updates counts correctly', async () => {
    const { accessToken } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    await agent
      .post(`/api/v1/reports/${reportId}/vote`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ vote: 'confirmed' });

    const res = await agent
      .post(`/api/v1/reports/${reportId}/vote`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ vote: 'disputed' });

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(0);
    expect(res.body.disputed).toBe(1);
    expect(res.body.userVote).toBe('disputed');
  });

  test('invalid vote type returns 400', async () => {
    const { accessToken } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    const res = await agent
      .post(`/api/v1/reports/${reportId}/vote`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ vote: 'not-valid' });

    expect(res.status).toBe(400);
  });
});

// ── Delete report ─────────────────────────────────────────────────────────────

const OTHER_USER = { name: 'Other User', email: 'other@example.com', password: 'ValidPass1!' }

describe('DELETE /api/v1/reports/:id', () => {
  let accessToken, userId, reportId
  let otherAccessToken

  beforeEach(async () => {
    ;({ accessToken, userId } = await createVerifiedUser())
    ;({ accessToken: otherAccessToken } = await createVerifiedUser(OTHER_USER))
    const createRes = await postReport(accessToken)
    reportId = createRes.body.report.id
  })

  test('owner deletes their own report within 6 hours → 200', async () => {
    const res = await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
  })

  test('deleted report no longer appears in /all', async () => {
    await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)

    const allRes = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(allRes.body.find(r => r.id === reportId)).toBeUndefined()
  })

  test('non-existent report returns 404', async () => {
    const res = await agent
      .delete('/api/v1/reports/99999')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(404)
  })

  test("deleting another user's report returns 403", async () => {
    const res = await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(403)
  })

  test('deleting a report older than 6 hours returns 403 with descriptive message', async () => {
    await pool.query(
      `UPDATE reports SET created_at = NOW() - INTERVAL '7 hours' WHERE id = $1`,
      [reportId]
    )
    const res = await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/6 hours/i)
  })

  test('trust score is decremented by 10 after deletion', async () => {
    const { rows: [{ trust_score: before }] } = await pool.query(
      'SELECT trust_score FROM users WHERE id = $1',
      [userId]
    )
    await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
    const { rows: [{ trust_score: after }] } = await pool.query(
      'SELECT trust_score FROM users WHERE id = $1',
      [userId]
    )
    expect(after).toBe(before - 10)
  })

  test('trust score floors at 0 when current score is below 10', async () => {
    await pool.query('UPDATE users SET trust_score = 5 WHERE id = $1', [userId])
    await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
    const { rows: [{ trust_score }] } = await pool.query(
      'SELECT trust_score FROM users WHERE id = $1',
      [userId]
    )
    expect(trust_score).toBe(0)
  })

  test('transaction: report removed from reports and archived in deleted_reports', async () => {
    await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)

    const { rows: inReports } = await pool.query(
      'SELECT id FROM reports WHERE id = $1',
      [reportId]
    )
    expect(inReports).toHaveLength(0)

    const { rows: inDeleted } = await pool.query(
      'SELECT id, deleted_by FROM deleted_reports WHERE id = $1',
      [reportId]
    )
    expect(inDeleted).toHaveLength(1)
    expect(inDeleted[0].deleted_by).toBe(userId)
  })

  test('unauthenticated delete returns 401', async () => {
    const res = await agent
      .delete(`/api/v1/reports/${reportId}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(401)
  })
})

// ── FCM payload shape ─────────────────────────────────────────────────────────

describe('FCM payload shape — new-report sends push to nearby users', () => {
  // The moduleNameMapper in jest.config.js maps 'config/firebase' to the jest.fn() mock,
  // so this is the jest.fn() spy, not the real firebase-admin send.
  const { sendPushNotification } = require('../config/firebase')

  // Distinct email so this user doesn't collide with REPORTER or OTHER_USER.
  const NEARBY_USER = { name: 'Nearby', email: 'nearby@example.com', password: 'ValidPass1!' }

  beforeEach(() => {
    sendPushNotification.mockClear()
  })

  test('new-report FCM payload carries type="new_report" and reportId', async () => {
    // The reporter creates the report (no image — avoids the pre-existing dynamic
    // import limitation that blocks image-processing in this test environment).
    const { accessToken } = await createVerifiedUser()

    // A second user positioned at the same coordinates as BASE_REPORT, within
    // the 30-mile radius, with a stored FCM token.
    const { userId: nearbyId } = await createVerifiedUser(NEARBY_USER)
    await pool.query(
      "UPDATE users SET fcm_token = 'nearby-fcm-token', last_lat = 12.9716, last_lng = 77.5946 WHERE id = $1",
      [nearbyId]
    )

    const createRes = await postReport(accessToken)
    expect(createRes.status).toBe(201)
    const reportId = createRes.body.report.id

    // The FCM broadcast is fire-and-forget; give the event loop a tick to settle.
    await new Promise((r) => setTimeout(r, 200))

    expect(sendPushNotification).toHaveBeenCalledWith(
      'nearby-fcm-token',
      expect.stringContaining('🚨'),
      expect.any(String),
      expect.objectContaining({ type: 'new_report', reportId: String(reportId) })
    )
  })
})

// ── Resolve ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/reports/resolve', () => {
  test('resolving a report awards +25 trust score to the report owner', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    // trust_score is already +10 from report creation; record it now
    const {
      rows: [{ trust_score: scoreBefore }],
    } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [userId]);

    await resolveReport(reportId);

    const {
      rows: [{ trust_score: scoreAfter }],
    } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [userId]);

    expect(scoreAfter).toBe(scoreBefore + 25);
  });

  test('resolution inserts a notification targeted only to the report owner', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    const res = await resolveReport(reportId);
    expect(res.status).toBe(200);

    // The INSERT is fire-and-forget inside the route; give the event loop a
    // tick to let the promise settle before asserting the DB row.
    await new Promise((r) => setTimeout(r, 200));

    const { rows } = await pool.query(
      "SELECT user_id, type FROM notifications WHERE type = 'resolved'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(userId); // targeted only at the owner
    expect(rows[0].type).toBe('resolved');
  });

  test('unauthenticated /resolve succeeds — documents missing auth gap', async () => {
    const { accessToken } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    // resolveReport() sends no Authorization header; /resolve has no verifyToken
    const res = await resolveReport(reportId);
    expect(res.status).toBe(200);
  });

  test('resolve without a proof image returns 400', async () => {
    const { accessToken } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    const res = await agent
      .post('/api/v1/reports/resolve')
      .set('X-CSRF-Token', csrfToken)
      .field('report_id', String(reportId));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/proof/i);
  });
});
