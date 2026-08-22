# Hetusafe — Safety Alert & Visibility Engine

![CI](https://github.com/Rishwanth05/project_save/actions/workflows/ci.yml/badge.svg)

A community-powered **public-safety PWA** where residents report, confirm, and track local hazards in real time. Reports appear live on a map, push notifications alert nearby users within 30 miles, and a trust-score system rewards consistent contributors.

---

## Features

### Authentication
- Two-step OTP login: password check → 6-digit email code via SendGrid
- Account lockout after 5 failed attempts (30-minute lock, email notification)
- JWT access tokens (15 min) + rotating refresh tokens (7 days)
- Access-token blacklist in Redis on logout
- CSRF protection on all state-changing routes (double-submit cookie)
- Forgot/reset password with single-use time-limited tokens
- Emergency contact management per user profile

### Hazard Reporting
- Submit reports with hazard category, severity, description, and GPS coordinates
- Photo upload: magic-byte validated (not just Content-Type), re-encoded to **WebP via Sharp** (strips all EXIF/GPS metadata), stored on **AWS S3**
- Daily limit: 5 reports per user per day (enforced via Redis)
- Duplicate detection: flags reports within 50 m of an existing open report in the last 24 hours
- Community resolution: any user can mark a report resolved with photographic proof
- Resolution voting: confirmed / disputed votes per report
- Live broadcast to all connected clients via **Socket.io** on every new report

### Trust Score & Gamification
- Score range 0–1,000: +10 per report submitted, +25 when your report is resolved
- Badge tiers: **Newcomer → Reporter → Trusted → Guardian → Hero**
- Achievement badges: First Report, 10 Reports, Resolver, Community Hero
- Public leaderboard (top 20 contributors by score)

### Notifications
- **Firebase Cloud Messaging (FCM)**: push notifications to nearby users within 30 miles (Haversine formula)
- In-app notification feed: per-user targeted messages + global broadcasts
- Real-time unread badge count; mark-all-read and soft-delete supported

### Admin Dashboard
- Live stats: total users, reports, resolved count, critical incidents
- User management: search/page, role changes, account deletion (with cascade null on reports)
- Report management: status workflow (active → under review → resolved etc.), bulk filter, delete
- 30-day analytics charts (Recharts): reports by day, category, severity; average resolution time
- Broadcast alerts to all users (inserted as notifications + Socket.io emit)
- Immutable audit log for all admin actions

### Infrastructure
- **PostgreSQL 15** (Render managed in production; Docker service locally)
- **Redis 7** for sessions, rate limiting, daily report counters, token blacklist
- Global rate limit: 100 req/min; auth routes: 20 req/15 min (both Redis-backed)
- Background jobs via `node-cron`: nightly DB backup, 30-day notification cleanup
- **GitHub Actions CI**: tests + build gate on every push/PR to master
- PWA: Workbox service worker, installable, offline-capable map tiles cached
- Monitoring: Sentry (backend + frontend), PostHog analytics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS |
| Mapping | MapLibre GL JS 5 |
| Charts | Recharts |
| Real-time | Socket.io (client + server) |
| Push | Firebase SDK 12 / Firebase Admin (FCM) |
| Backend | Node.js 20, Express 5 |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 (ioredis) |
| Auth | JWT, bcryptjs, csrf-csrf |
| Validation | Zod |
| Image processing | Sharp (WebP re-encode, EXIF strip), file-type (magic bytes) |
| File storage | AWS S3 (SDK v3) |
| Email | SendGrid |
| Monitoring | Sentry, PostHog |
| Containerisation | Docker / Docker Compose |
| CI/CD | GitHub Actions → Render deploy hook |

---

## Project Structure

```
project-save/
├── .github/
│   └── workflows/
│       ├── ci.yml          # test + build jobs on push/PR to master
│       └── deploy.yml      # Render deploy hook on push to master
├── backend/
│   ├── migrations/         # ordered SQL migration files
│   ├── scripts/            # nightly DB backup shell script
│   ├── src/
│   │   ├── config/         # redis.js, firebase.js
│   │   ├── jobs/           # node-cron background tasks
│   │   ├── middleware/      # auth.js (verifyToken, requireAdmin)
│   │   ├── routes/         # one file per API domain (see API reference)
│   │   ├── tests/          # Jest integration test suite (70 tests)
│   │   │   └── __mocks__/  # Firebase, S3, file-type stubs
│   │   ├── utils/          # email.js (SendGrid helpers)
│   │   ├── app.js          # Express app (middleware, route mounts)
│   │   ├── db.js           # pg Pool singleton
│   │   └── server.js       # HTTP + Socket.io server, cron start
│   ├── .env.test           # test environment (safe defaults, no real secrets)
│   ├── jest.config.js
│   └── package.json
├── frontend-react/
│   ├── public/             # manifest.json, PWA icons
│   ├── src/                # React components, pages, hooks
│   ├── vite.config.js      # Vite + PWA plugin config
│   └── package.json
└── docker-compose.yml      # Postgres 15 + Redis 7 for local dev
```

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Start Postgres and Redis

```bash
docker compose up -d
```

This starts `save_postgres` (port 5432) and `save_redis` (port 6379) using the credentials in `docker-compose.yml`.

### 2. Load the database schema

```bash
# Run from the repo root
PGPASSWORD=<your-db-pass> psql -h localhost -U save_user -d hetusafe \
  -f backend/migrations/schema.sql

# Then run each migration in order:
for f in backend/migrations/sprint_week1_security.sql \
          backend/migrations/week4_audit_log.sql \
          backend/migrations/week4_deletion_comments.sql \
          backend/migrations/week5_fcm_tokens.sql \
          backend/migrations/week5_master_data.sql \
          backend/migrations/week5_notifications_soft_delete.sql \
          backend/migrations/week5_refresh_tokens.sql \
          backend/migrations/week5_user_location.sql \
          backend/migrations/week6_notifications_per_user.sql \
          backend/migrations/resolution_votes.sql; do
  PGPASSWORD=<your-db-pass> psql -h localhost -U save_user -d hetusafe -f "$f"
done
```

### 3. Configure environment variables

Create `backend/.env` (never commit this file):

```env
# Server
PORT=5000

# Database — local Docker
DB_DEV_URL=postgresql://save_user:<password>@localhost:5432/hetusafe

# Database — Render production (leave blank for local dev)
DB_PROD_URL=

# JWT & CSRF
JWT_SECRET=<random 32+ char string>
CSRF_SECRET=<random 32+ char string>

# Redis
REDIS_URL=redis://localhost:6379

# Frontend origin (for CORS)
FRONTEND_URL=http://localhost:5173

# SendGrid
SENDGRID_API_KEY=SG.<your_key>
SENDGRID_FROM=noreply@yourdomain.com
SENDGRID_TO=you@yourdomain.com

# Firebase Admin SDK (JSON service account — single-line)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# AWS S3
S3_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Create `frontend-react/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
VITE_SENTRY_DSN=           # optional
VITE_POSTHOG_KEY=          # optional
VITE_POSTHOG_HOST=         # optional
```

### 4. Run the backend

```bash
cd backend
npm install
npm run dev       # nodemon, restarts on change
```

### 5. Run the frontend

```bash
cd frontend-react
npm install
npm run dev       # Vite dev server at http://localhost:5173
```

---

## API Reference

All routes are prefixed with `/api/v1/` unless noted. State-changing routes require a valid `X-CSRF-Token` header (obtain from `GET /api/csrf-token`). Protected routes require `Authorization: Bearer <token>`.

### Auth `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | — | Register; sends verification OTP |
| POST | `/verify-email` | — | Confirm email OTP; returns tokens |
| POST | `/login` | — | Step 1: validate password; sends login OTP |
| POST | `/verify-login` | — | Step 2: confirm login OTP; returns tokens |
| POST | `/logout` | ✓ | Blacklist access token, revoke refresh token |
| POST | `/refresh` | — | Rotate refresh token; returns new pair |
| GET | `/me` | ✓ | Current user profile |
| GET | `/my-reports` | ✓ | Reports submitted by the current user |
| PUT | `/update-name` | ✓ | Update display name |
| PUT | `/change-password` | ✓ | Change password (requires current password) |
| POST | `/resend-otp` | — | Re-send OTP (verify or login purpose) |
| POST | `/fcm-token` | ✓ | Register Firebase push token |
| POST | `/forgot-password` | — | Send password-reset link |
| POST | `/reset-password` | — | Consume reset token, set new password |
| POST | `/request-delete` | ✓ | Send account-deletion OTP |
| DELETE | `/delete-account` | ✓ | Confirm deletion OTP; permanently deletes account |
| GET | `/emergency-contacts` | ✓ | Fetch emergency contacts |
| PUT | `/emergency-contacts` | ✓ | Save emergency contacts (max 10) |

### Reports `/api/v1/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/all` | ✓ | All active reports (cached 30 s in Redis) |
| POST | `/create` | ✓ | Submit a report; optional image upload to S3 |
| POST | `/resolve` | — | Mark resolved with proof photo |
| POST | `/check-duplicate` | — | 50 m / 24 hr duplicate check |
| GET | `/trust/:userId` | — | Trust score and badge tier for a user |
| GET | `/:id/votes` | ✓ | Vote counts + current user's vote |
| POST | `/:id/vote` | ✓ | Cast or change vote (confirmed / disputed) |

### Admin `/api/v1/admin` *(requires admin role)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard counts + recent reports + 7-day chart |
| GET | `/users` | Paginated user list with search |
| DELETE | `/users/:id` | Delete user (nullifies their reports) |
| PUT | `/users/:id/role` | Change user role (user / admin) |
| GET | `/reports` | Paginated report list with status/severity filter |
| PUT | `/reports/:id/status` | Update report status; logs to audit trail |
| DELETE | `/reports/:id` | Delete report |
| GET | `/analytics` | 30-day charts: by day, category, severity, resolution time |
| POST | `/broadcast` | Create notification visible to all users |
| GET | `/audit-log` | Paginated admin action log |

### Badges & Leaderboard `/api/v1/badges`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | ✓ | Current user's earned badges and stats |
| GET | `/leaderboard` | — | Top 20 contributors by score |

### Notifications `/api/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Latest 30 notifications for this user |
| GET | `/unread-count` | ✓ | Count of unread notifications since last read |
| PUT | `/read-all` | ✓ | Mark all notifications as read |
| DELETE | `/clear-all` | ✓ | Soft-delete all visible notifications |
| DELETE | `/:id` | ✓ | Soft-delete a single notification |

### Master Data `/api/v1/master`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | — | Active hazard categories |
| GET | `/severities` | — | Active severity levels |
| GET | `/statuses` | — | Active report statuses |
| POST | `/categories` | admin | Create hazard category |
| PATCH | `/categories/:id/toggle` | admin | Enable / disable a category |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/csrf-token` | — | Get double-submit CSRF token (also sets cookie) |
| GET | `/api/v1/public/stats` | — | Public stats for landing page |
| POST | `/api/v1/contact/send` | — | Send contact-form message via SendGrid |

---

## Testing

The backend has a Jest integration test suite that runs against a real PostgreSQL and Redis instance.

```bash
cd backend

# Run all 70 tests
npm test

# Run with coverage report
npm run test:coverage
```

**What's tested:**
- `auth.test.js` — signup, OTP verification, login flow, token refresh, logout/blacklist, forgot/reset password (28 tests)
- `reports.test.js` — report creation (with/without image, fake magic bytes), trust score changes, resolution notification targeting, voting (14 tests)
- `admin.test.js` — role enforcement, every admin route, status-change side-effect documentation, CSRF rejection, rate-limit behaviour (28 tests)

CI runs the full suite on every push and PR targeting `master` using GitHub Actions service containers for Postgres and Redis (no Docker Compose in CI).

---

## Deployment

**Production stack**

| Service | Platform |
|---------|----------|
| Backend API | Render (Web Service) |
| PostgreSQL | Render (Managed Postgres) |
| Redis | Render (Managed Redis) |
| Frontend | *(static host of your choice)* |
| Images | AWS S3 |

**CI/CD pipeline**

1. Push to `master` → GitHub Actions runs `test` job (Postgres + Redis containers, 70 Jest tests).
2. If tests pass → `build` job runs (`npm ci` + `vite build`).
3. On success → `deploy.yml` triggers the Render deploy hook, which pulls and redeploys the backend.

---

## Author

**Rishwanth Reddy Adamala**
MS Computer Science — University of Central Missouri
