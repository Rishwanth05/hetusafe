# Hetusafe — Safety Alert & Visibility Engine

A community-powered PWA where residents report, confirm, and track local hazards in real time.

> Two-factor auth, WebSocket broadcasting, proximity-based FCM push notifications, a trust-score system, and an admin audit surface — built as a portfolio project with production-grade security and a CI pipeline that runs against real infrastructure.

---

![CI](https://github.com/Rishwanth05/project_save/actions/workflows/ci.yml/badge.svg)

---

## Overview

Urban residents often lack a fast, reliable channel to flag local safety hazards — road damage, flooding, downed power lines — and verify whether they've been addressed. Hetusafe provides a map-centric interface where users submit geo-tagged reports that appear live for anyone in the area.

The backend is a Node.js/Express API backed by PostgreSQL and Redis. Reports are broadcast over Socket.io to all connected clients, so active map sessions reflect new submissions without polling. Push notifications reach users within a 30-mile radius via Firebase Cloud Messaging, including when the app is not open. A trust-score system records each user's contribution history; the score increases by 10 points on submission and by 25 when a report is resolved by another community member, driving badge tier progression from Newcomer to Hero.

The design treats security and observability as first-class concerns rather than afterthoughts. Every state-changing route requires both a verified JWT and a double-submit CSRF token. Uploaded images are validated against their file signatures, re-encoded to strip metadata, and stored on S3. All admin actions are written to an immutable audit log. The 91-test suite runs against real PostgreSQL and Redis instances in CI — not in-memory substitutes — so integration failures surface before they reach production.

---

## Architecture

```
Browser / PWA
     │
     ├── HTTP/REST ──▶  Express (Node.js 20)  ──▶  PostgreSQL 15
     │                        │               ──▶  Redis 7
     └── WebSocket ──▶  Socket.io             ──▶  AWS S3 (images)
                              │
                              └── Firebase Admin SDK ──▶ FCM ──▶ Device
```

---

## Engineering Highlights

### Real-Time Report Propagation

New hazard reports are persisted in PostgreSQL and immediately broadcast to all connected clients via Socket.io's `io.emit`. Active map sessions update without polling. The Redis cache for the report list endpoint (30-second TTL) is invalidated on every write, so the next REST fetch also reflects the change.

### Proximity Push Notifications

When a report is created, the server queries users whose last known coordinates fall within a 30-mile radius using the Haversine formula evaluated directly in PostgreSQL. FCM tokens for qualifying users are collected in a single query and delivered via Firebase Admin SDK. The service worker handles `onBackgroundMessage` for delivery when the app is not open; the `notificationclick` handler navigates to `/results?focus=<reportId>`, routing the user to the relevant report on the map. Resolution notifications follow a separate path: only the original report owner receives them, identified by `user_id` on the notification row.

### Authentication

Login is a two-step process: password validation followed by a 6-digit OTP sent via SendGrid. Access tokens carry a 15-minute expiry; refresh tokens are stored in PostgreSQL and rotated on every use with a 7-day rolling window. On logout, the access token is written to a Redis blacklist with a 900-second TTL, matching the token's remaining lifetime exactly. Five consecutive failed login attempts lock the account for 30 minutes and trigger an email notification. All state-changing routes require a double-submit CSRF token in addition to a valid JWT.

### Secure Image Pipeline

Photo uploads pass through three stages before reaching S3. The file's magic bytes are checked against an allowlist using the `file-type` library — the client-supplied `Content-Type` header is ignored. The image is then re-encoded to WebP at quality 80 via Sharp, removing all embedded EXIF and GPS metadata. Sharp's output buffer is copied from its WASM heap into a plain Node.js `Buffer` before the S3 upload, because the AWS SDK v3 rejects `SharedArrayBuffer` in the request body.

### Redis Operational Role

Redis serves five distinct responsibilities: a global rate limit (100 requests per minute), a stricter auth-route limit (20 requests per 15 minutes), a 30-second response cache for the active reports list, a per-user daily submission counter (capped at 5, keyed by date), and an access-token blacklist for immediate revocation on logout. Each concern uses a separate key namespace with an appropriate TTL.

### Testing Approach

The 91 integration tests run against real PostgreSQL 15 and Redis 7 instances provisioned as GitHub Actions service containers. No database or cache layer is mocked. `auth.test.js` (28 tests) covers the full authentication flow including token rotation and blacklisting. `reports.test.js` (24 tests) covers creation with and without images, magic-byte rejection, trust-score deltas, and resolution notification targeting. `admin.test.js` (39 tests) covers role enforcement, every admin route, status-change side effects, CSRF rejection, and rate-limit behaviour.

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

## Testing & CI/CD

91 integration tests across three suites run against real PostgreSQL 15 and Redis 7 service containers on every push and pull request to `master` — no in-memory substitutes for the database or cache layer. The Vite production build runs only after all tests pass. On success, `deploy.yml` triggers the Render deploy hook.

| Suite | Tests | Scope |
|---|---|---|
| `auth.test.js` | 28 | Signup, OTP, login, token rotation, logout/blacklist, password reset |
| `reports.test.js` | 24 | Creation, magic-byte rejection, trust-score delta, resolution notification targeting, voting |
| `admin.test.js` | 39 | Role enforcement, every admin route, status-change side effects, CSRF rejection, rate-limit behaviour |

---

## Running Locally

**Prerequisites:** Node.js 20+, Docker

```bash
# 1. Start Postgres 15 + Redis 7
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env   # fill in required values
npm install
npm run dev            # nodemon on :5000

# 3. Frontend (separate terminal)
cd frontend-react
cp .env.example .env   # fill in required values
npm install
npm run dev            # Vite on :5173
```

See [`backend/.env.example`](backend/.env.example) and [`frontend-react/.env.example`](frontend-react/.env.example) for all required configuration keys.

After the first `docker compose up`, run the database migrations:

```bash
PGPASSWORD=<pass> psql -h localhost -U save_user -d hetusafe \
  -f backend/migrations/schema.sql
# Then apply migration files in backend/migrations/ in filename order
```

---

## Documentation

Full API reference — all routes, auth requirements, and parameter notes: [`docs/API.md`](docs/API.md).

**Repository layout:**

```
backend/           Node.js/Express API, migrations, tests
frontend-react/    React PWA
docs/              API reference
.github/           CI and deploy workflows
docker-compose.yml
```

---

## Roadmap

- **Horizontal scaling:** the Socket.io layer uses a single server process; a Redis pub/sub adapter would allow multiple backend instances to share the event bus without sticky sessions.
- **Load testing:** establish throughput baselines before adding read replicas or connection pool tuning.
- **Offline report queuing:** use the service worker's Background Sync API to queue reports submitted without connectivity and flush them on reconnect.

---

## Author

**Rishwanth Reddy Adamala**
MS Computer Science — University of Central Missouri
