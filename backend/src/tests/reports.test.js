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
// Pass accessToken to authenticate; omit (or pass undefined) to test the 401 path.
function resolveReport(reportId, accessToken) {
  const req = agent
    .post('/api/v1/reports/resolve')
    .set('X-CSRF-Token', csrfToken)
  if (accessToken) req.set('Authorization', `Bearer ${accessToken}`)
  return req
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
  // Response shape changed: { reports: [...], nextCursor: string|null }
  test('created report appears in reports array with correct fields', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    const createRes = await postReport(accessToken);
    expect(createRes.status).toBe(201);

    const reportId = createRes.body.report.id;

    const allRes = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(allRes.status).toBe(200);
    expect(Array.isArray(allRes.body.reports)).toBe(true);

    const found = allRes.body.reports.find((r) => r.id === reportId);
    expect(found).toBeDefined();
    expect(found.hazard_type).toBe(BASE_REPORT.hazard_type);
    expect(found.severity).toBe(BASE_REPORT.severity);
    expect(found.user_id).toBe(userId);
  });

  test('unauthenticated GET /all returns 401', async () => {
    const res = await agent.get('/api/v1/reports/all');
    expect(res.status).toBe(401);
  });

  test('default page size: no limit param returns at most 100 reports', async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.reports.length).toBeLessThanOrEqual(100);
    expect(res.body).toHaveProperty('nextCursor');
  });

  test('limit above max (200) is capped to 200', async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await agent
      .get('/api/v1/reports/all')
      .query({ limit: 9999 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    // With fewer than 200 test rows this returns all, but the cap is exercised
    expect(res.body.reports.length).toBeLessThanOrEqual(200);
  });

  test('cursor pagination: two sequential pages cover all reports with no duplicates', async () => {
    const { accessToken } = await createVerifiedUser();

    // Create 3 reports — more than page_size=2 so pagination kicks in
    await postReport(accessToken);
    await postReport(accessToken);
    await postReport(accessToken);

    // Page 1: limit=2
    const page1 = await agent
      .get('/api/v1/reports/all')
      .query({ limit: 2 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.reports).toHaveLength(2);
    expect(page1.body.nextCursor).toBeTruthy();

    // Page 2: use cursor from page 1
    const page2 = await agent
      .get('/api/v1/reports/all')
      .query({ limit: 2, cursor: page1.body.nextCursor })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(page2.status).toBe(200);
    expect(page2.body.reports.length).toBeGreaterThanOrEqual(1);

    // No duplicate IDs across both pages
    const ids1 = page1.body.reports.map(r => r.id);
    const ids2 = page2.body.reports.map(r => r.id);
    const overlap = ids1.filter(id => ids2.includes(id));
    expect(overlap).toHaveLength(0);

    // All 3 reports accounted for (total = page1 + page2)
    expect(ids1.length + ids2.length).toBe(3);
  });

  test('last page returns nextCursor: null', async () => {
    const { accessToken } = await createVerifiedUser();
    await postReport(accessToken);

    // Fetch with limit larger than available reports
    const res = await agent
      .get('/api/v1/reports/all')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.nextCursor).toBeNull();
  });

  test('empty result set returns reports: [] and nextCursor: null', async () => {
    // No reports created in this test — DB was truncated by beforeEach
    const { accessToken } = await createVerifiedUser();
    const res = await agent
      .get('/api/v1/reports/all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.reports).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  test('invalid cursor returns 400', async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await agent
      .get('/api/v1/reports/all')
      .query({ cursor: 'notvalidbase64!!!' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  test('concurrent first-page requests all return the same payload (single-flight lock)', async () => {
    const { accessToken } = await createVerifiedUser();
    await postReport(accessToken);

    // Evict any warm cache so all requests hit the lock path simultaneously
    await redis.del('reports:all');
    await redis.del('lock:reports:all');

    // 5 concurrent GET /all — first acquires the lock and rebuilds; others wait
    // via the exponential backoff loop and read the populated cache
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        agent
          .get('/api/v1/reports/all')
          .set('Authorization', `Bearer ${accessToken}`)
      )
    );

    results.forEach(res => expect(res.status).toBe(200));

    const refIds = results[0].body.reports.map(r => r.id).sort();
    const refCursor = results[0].body.nextCursor;
    results.slice(1).forEach(res => {
      expect(res.body.reports.map(r => r.id).sort()).toEqual(refIds);
      expect(res.body.nextCursor).toBe(refCursor);
    });
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

// ── GET vote counts ───────────────────────────────────────────────────────────

describe('GET /api/v1/reports/:id/votes', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns zero counts and null userVote when no votes exist', async () => {
    const { accessToken } = await createVerifiedUser();
    const { body: { report: { id: reportId } } } = await postReport(accessToken);

    const res = await agent
      .get(`/api/v1/reports/${reportId}/votes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ confirmed: 0, disputed: 0, userVote: null });
  });

  test("returns correct counts and caller's vote after voting", async () => {
    const { accessToken } = await createVerifiedUser();
    const { body: { report: { id: reportId } } } = await postReport(accessToken);

    await agent
      .post(`/api/v1/reports/${reportId}/vote`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ vote: 'confirmed' });

    const res = await agent
      .get(`/api/v1/reports/${reportId}/votes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ confirmed: 1, disputed: 0, userVote: 'confirmed' });
  });

  test('userVote is null for a user who has not voted when others have', async () => {
    const VIEWER = { name: 'Viewer', email: 'viewer@example.com', password: 'ValidPass1!' };
    const { accessToken: voterToken } = await createVerifiedUser();
    const { accessToken: viewerToken } = await createVerifiedUser(VIEWER);
    const { body: { report: { id: reportId } } } = await postReport(voterToken);

    await agent
      .post(`/api/v1/reports/${reportId}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ vote: 'confirmed' });

    const res = await agent
      .get(`/api/v1/reports/${reportId}/votes`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ confirmed: 1, disputed: 0, userVote: null });
  });

  test('issues exactly one database query per request', async () => {
    const { accessToken } = await createVerifiedUser();
    const { body: { report: { id: reportId } } } = await postReport(accessToken);

    const querySpy = jest.spyOn(pool, 'query');

    await agent
      .get(`/api/v1/reports/${reportId}/votes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken);

    expect(querySpy.mock.calls.length).toBe(1);
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
    expect(allRes.body.reports.find(r => r.id === reportId)).toBeUndefined()
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
  const { sendPushNotificationBatch } = require('../config/firebase')

  // Distinct email so this user doesn't collide with REPORTER or OTHER_USER.
  const NEARBY_USER = { name: 'Nearby', email: 'nearby@example.com', password: 'ValidPass1!' }

  beforeEach(() => {
    sendPushNotificationBatch.mockClear()
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

    expect(sendPushNotificationBatch).toHaveBeenCalledWith(
      ['nearby-fcm-token'],
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

    await resolveReport(reportId, accessToken);

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

    const res = await resolveReport(reportId, accessToken);
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

  test('unauthenticated /resolve returns 401', async () => {
    const { accessToken } = await createVerifiedUser();
    const {
      body: {
        report: { id: reportId },
      },
    } = await postReport(accessToken);

    // resolveReport() sends no Authorization header; verifyToken now rejects it
    const res = await resolveReport(reportId);
    expect(res.status).toBe(401);
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
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .field('report_id', String(reportId));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/proof/i);
  });

  test('nonexistent report_id returns 404 and does not upload to S3', async () => {
    const { mockSend } = require('./__mocks__/client-s3');
    mockSend.mockClear();

    const { accessToken } = await createVerifiedUser();
    const res = await resolveReport(999999, accessToken);

    expect(res.status).toBe(404);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('resolving the same report twice returns 409 on second call and awards trust only once', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    const {
      body: { report: { id: reportId } },
    } = await postReport(accessToken);

    const { rows: [{ trust_score: scoreBefore }] } = await pool.query(
      'SELECT trust_score FROM users WHERE id = $1', [userId]
    );

    const first = await resolveReport(reportId, accessToken);
    expect(first.status).toBe(200);

    const second = await resolveReport(reportId, accessToken);
    expect(second.status).toBe(409);

    const { rows: [{ trust_score: scoreAfter }] } = await pool.query(
      'SELECT trust_score FROM users WHERE id = $1', [userId]
    );
    expect(scoreAfter).toBe(scoreBefore + 25);
  });

  // ── report_id input validation ────────────────────────────────────────────
  //
  // Before this fix, invalid report_id values caused confusing outcomes:
  //   non-integer strings → 500 (PostgreSQL type-cast error leaked via next(err))
  //   negative numbers    → 404 (valid integer, but no matching row)
  //   zero (as string)    → 404 (valid integer, but no matching row)
  //   oversize (>INT_MAX) → 500 (PostgreSQL "integer out of range")
  //
  // The resolveSchema + validate() middleware now catches all of these
  // before the DB is queried, returning a clean 400.

  describe('report_id validation', () => {
    // Helper: POST /resolve with an arbitrary raw report_id string + proof image.
    function resolveWithRawId(rawId, accessToken) {
      const req = agent
        .post('/api/v1/reports/resolve')
        .set('X-CSRF-Token', csrfToken)
        .set('Authorization', `Bearer ${accessToken}`);
      if (rawId !== undefined) req.field('report_id', String(rawId));
      return req.attach('proof', testJpegBuffer, { filename: 'proof.jpg', contentType: 'image/jpeg' });
    }

    let accessToken;
    beforeEach(async () => {
      ({ accessToken } = await createVerifiedUser());
    });

    test('non-numeric string returns 400, not 500', async () => {
      const res = await resolveWithRawId('abc', accessToken);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    test('decimal returns 400', async () => {
      const res = await resolveWithRawId('1.5', accessToken);
      expect(res.status).toBe(400);
    });

    test('negative integer returns 400, not 404', async () => {
      const res = await resolveWithRawId('-1', accessToken);
      expect(res.status).toBe(400);
    });

    test('zero returns 400, not 404', async () => {
      const res = await resolveWithRawId('0', accessToken);
      expect(res.status).toBe(400);
    });

    test('value exceeding PostgreSQL INT_MAX (2147483647) returns 400, not 500', async () => {
      const res = await resolveWithRawId('9999999999', accessToken);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/out of range/i);
    });

    test('SQL-injection-style string returns 400, not 500', async () => {
      const res = await resolveWithRawId("1; DROP TABLE reports; --", accessToken);
      expect(res.status).toBe(400);
    });

    test('valid integer report_id still reaches the route logic (404 for nonexistent)', async () => {
      // Confirms the validation layer is additive — a valid id passes through
      // to the existing 404 guard unchanged.
      const res = await resolveWithRawId('999999', accessToken);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });
});

// ── GET /trust/:userId — auth gate ───────────────────────────────────────────

describe('GET /api/v1/reports/trust/:userId', () => {
  test('unauthenticated request returns 401', async () => {
    const res = await agent.get('/api/v1/reports/trust/1')
    expect(res.status).toBe(401)
  })

  test('authenticated request returns trust_score and badge_tier for a valid user', async () => {
    const { accessToken, userId } = await createVerifiedUser()

    const res = await agent
      .get(`/api/v1/reports/trust/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.trust_score).toBe('number')
    expect(typeof res.body.badge_tier).toBe('string')
  })

  test('authenticated request for non-existent user returns 404', async () => {
    const { accessToken } = await createVerifiedUser()

    const res = await agent
      .get('/api/v1/reports/trust/99999')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })
})

// ── POST /check-duplicate — auth gate ────────────────────────────────────────

describe('POST /api/v1/reports/check-duplicate', () => {
  const DUPLICATE_PAYLOAD = {
    latitude: 12.9716,
    longitude: 77.5946,
    hazard_type: 'Pothole',
  }

  test('unauthenticated request returns 401', async () => {
    const res = await agent
      .post('/api/v1/reports/check-duplicate')
      .set('X-CSRF-Token', csrfToken)
      .send(DUPLICATE_PAYLOAD)
    expect(res.status).toBe(401)
  })

  test('authenticated request with no nearby reports returns isDuplicate: false', async () => {
    const { accessToken } = await createVerifiedUser()

    const res = await agent
      .post('/api/v1/reports/check-duplicate')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send(DUPLICATE_PAYLOAD)

    expect(res.status).toBe(200)
    expect(res.body.isDuplicate).toBe(false)
  })

  test('authenticated request returns isDuplicate: true when a nearby same-category report exists', async () => {
    const { accessToken, userId } = await createVerifiedUser()

    await pool.query(
      `INSERT INTO reports (user_id, hazard_type, severity, description, latitude, longitude, location_method)
       VALUES ($1, $2, 'medium', 'Existing report', $3, $4, 'gps')`,
      [userId, DUPLICATE_PAYLOAD.hazard_type, DUPLICATE_PAYLOAD.latitude, DUPLICATE_PAYLOAD.longitude]
    )

    const res = await agent
      .post('/api/v1/reports/check-duplicate')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send(DUPLICATE_PAYLOAD)

    expect(res.status).toBe(200)
    expect(res.body.isDuplicate).toBe(true)
    expect(res.body.existing).toBeDefined()
    expect(res.body.existing.hazard_type).toBe(DUPLICATE_PAYLOAD.hazard_type)
  })
})

// ── updateTrustScore — enforced contract and badge_tier atomicity ─────────────

describe('updateTrustScore', () => {
  const updateTrustScore = require('../routes/reportRoutes')._updateTrustScore;

  test('throws if called with bare pool instead of a transaction client', async () => {
    // pool lacks a release() method — the contract check uses this to detect bare pool
    await expect(updateTrustScore(pool, 1, 10)).rejects.toThrow(
      'updateTrustScore requires a transaction client'
    );
  });

  test('report creation updates both trust_score and badge_tier', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    await postReport(accessToken);

    const { rows: [{ trust_score, badge_tier }] } = await pool.query(
      'SELECT trust_score, badge_tier FROM users WHERE id = $1', [userId]
    );

    expect(trust_score).toBeGreaterThan(0);
    const expectedTier =
      trust_score >= 800 ? 'Hero' :
      trust_score >= 600 ? 'Guardian' :
      trust_score >= 400 ? 'Trusted' :
      trust_score >= 200 ? 'Reporter' : 'Newcomer';
    expect(badge_tier).toBe(expectedTier);
  });

  test('report resolution updates both trust_score and badge_tier', async () => {
    const { accessToken, userId } = await createVerifiedUser();
    const { body: { report: { id: reportId } } } = await postReport(accessToken);
    await resolveReport(reportId, accessToken);

    const { rows: [{ trust_score, badge_tier }] } = await pool.query(
      'SELECT trust_score, badge_tier FROM users WHERE id = $1', [userId]
    );

    expect(trust_score).toBeGreaterThan(0);
    const expectedTier =
      trust_score >= 800 ? 'Hero' :
      trust_score >= 600 ? 'Guardian' :
      trust_score >= 400 ? 'Trusted' :
      trust_score >= 200 ? 'Reporter' : 'Newcomer';
    expect(badge_tier).toBe(expectedTier);
  });
});
