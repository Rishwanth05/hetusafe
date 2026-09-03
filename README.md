# HetuSafe

A real-time civic safety platform and Progressive Web App where residents report, verify, and track physical neighborhood hazards.

[![CI Pipeline](https://github.com/Rishwanth05/hetusafe/actions/workflows/ci.yml/badge.svg)](https://github.com/Rishwanth05/hetusafe/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[Live Application](https://hetusafe.com) • [Architecture](#architecture) • [Engineering Highlights](#engineering-highlights) • [Running Locally](#running-locally) • [API Specification](docs/API.md)

---

## Overview

Local hazards such as flooding, damaged roads, or downed infrastructure can affect nearby residents before information reaches them through traditional reporting channels. HetuSafe makes community reports immediately visible to people in the affected area.

The platform persists reports to PostgreSQL and broadcasts them to connected clients over Socket.io, so active map sessions reflect new submissions without polling. Push notifications reach residents within a 30-mile radius via Firebase Cloud Messaging, including when the application is not open. A trust-score system tracks contribution history, awarding 10 points per report submitted and 25 points when a report is resolved by another community member.

The core service prioritizes strict data integrity and real-world edge defense:
* **Secure Media Processing:** File signatures are inspected at the byte level before images undergo automated metadata stripping and WebP transcoding.
* **Proximity Event Routing:** Database-level spatial distance evaluations drive targeted push fanouts without polling.
* **Infrastructure-backed Integration Testing:** A 91-case test suite executes against live PostgreSQL and Redis service containers inside GitHub Actions — preventing in-memory mocking artifacts from reaching production.

---

## Architecture

```text
               +-------------------------------------------------------------+
               |                  Client Surface (React 19 PWA)             |
               |         MapLibre GL  •  Workbox SW  •  Firebase Client       |
               +------------------------------+------------------------------+
                                              |
                     HTTPS (REST API)         |          WebSocket (WSS)
               Stateful & Auth Operations     |      Live Incident Broadcasts
                                              v
               +-------------------------------------------------------------+
               |                 API Service (Node.js / Express 5)           |
               |   [Zod Payload Parser]  [Dual-Submit CSRF]  [Rate Limiter]  |
               +--------------+------------------------------+---------------+
                              |                              |
                Persistent    |                              |  Cache / Ephemeral State
                   Data       v                              v
               +-----------------------------+ +-----------------------------+
               |       PostgreSQL 15         | |       Redis 7               |
               | - Incidents & Audit Trail   | | - Access Token Blacklist    |
               | - Haversine Geospatial Calc | | - 30s GeoJSON Query Cache   |
               | - Soft-Delete Archive Log   | | - Daily Quotas & Auth Limit |
               +-----------------------------+ +-----------------------------+
                              |                              |
                              | S3 Upload (Clean WebP)       | Event Fanout
                              v                              v
               +-----------------------------+ +-----------------------------+
               |      AWS S3 Object Store    | |  Firebase Cloud Messaging   |
               |  Stripped EXIF Proof Photos | |  Background Proximity Push  |
               +-----------------------------+ +-----------------------------+
```

---

## Engineering Highlights

### Real-time Updates

When a new incident is persisted, it immediately broadcasts to active map sessions via Socket.io (`io.emit`), rendering without polling latency. To balance live map traffic against database load, read queries hitting `/reports/all` use a 30-second Redis TTL. Every write transaction proactively clears this key, ensuring the next cold fetch returns synchronized state while insulating the connection pool from traffic spikes.

### Spatial Distance Calculations & Targeted Alerts

Push notifications use localized proximity rather than broad channel blasts. On report creation, PostgreSQL evaluates the Haversine distance between the report coordinates and stored user locations to select users within a 30-mile radius. Eligible FCM device tokens are queried in a single database pass and dispatched through the Firebase Admin SDK. The service worker handles background FCM messages when the application is not actively open in the foreground, and tapping the notification deep-links to the focused map coordinate (`/results?focus=<reportId>`). Community resolution alerts remain point-to-point, targeting only the original report owner.

### Secure Media Processing

Uploads pass through three validation and normalization stages before reaching S3:

1. **Magic-Byte Inspection:** The request's incoming `Content-Type` header is discarded. The payload buffer is verified directly against an allowlist via `file-type`.
2. **EXIF Purging & WebP Conversion:** Media is re-encoded to WebP (quality 80) through Sharp, stripping all EXIF and GPS tags.
3. **Buffer Normalization:** The processed image is converted to a standard Node.js `Buffer` before being passed to the AWS SDK v3 for the S3 upload.

### Session Termination via Token Blacklist

To retain short-lived stateless access tokens while supporting immediate logout, the application uses 15-minute JWT access tokens paired with rotating 7-day refresh tokens stored in PostgreSQL. On logout, the access token is added to a Redis blacklist with a fixed 900-second TTL — equal to its full lifetime — so it cannot be reused even if intercepted after logout. Inbound requests check this in-memory blacklist, allowing session termination without a database roundtrip on every request.

### Atomic Self-Deletion & Moderation Lifecycle

Report owners can delete their submission within a 6-hour window. To prevent orphaned state or point farming, the deletion executes as an atomic database transaction:

* The report payload is copied into a `deleted_reports` moderation archive.
* Associated votes and status histories are dropped.
* The original +10 trust points awarded on creation are deducted from the user's score (floored at zero).
* Admins retain access to the `deleted_reports` table for 24 hours for audit and dispute verification before automated deletion.

### Redis Operational Responsibilities

Redis isolates five distinct concerns into dedicated key namespaces with independent expiration policies:

* **Global Rate Limiting:** 100 req/min per IP.
* **Auth Protection:** 20 req/15 min per IP; 5 failed login attempts enforce a 30-minute lockout.
* **Quota Counters:** Maximum 5 reports per user/day via dynamic date keys (`user:<id>:reports:<YYYY-MM-DD>`).
* **Active Cache:** 30-second TTL for map incidents.
* **Token Blacklist:** Fixed 900-second TTL, equal to the access token's full lifetime.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Client / PWA** | React 19, Vite 7, Tailwind CSS, MapLibre GL JS 5, Recharts, Workbox |
| **Runtime & API** | Node.js 20 LTS, Express 5, Socket.io |
| **Data Persistence** | PostgreSQL 15, Redis 7 (`ioredis`) |
| **Object Storage & Delivery** | AWS S3 (SDK v3), Firebase Admin SDK (FCM HTTP v1) |
| **Security & Auth** | Zod, `file-type`, Sharp, `csrf-csrf`, `bcryptjs`, SendGrid |
| **Observability** | Sentry (error monitoring, performance tracing), PostHog (telemetry) |
| **Testing & CI** | Jest, Supertest, Docker Compose, GitHub Actions |

---

## Running Locally

### Prerequisites

* Node.js `>= 20.0.0`
* Docker Engine `>= 24.0.0` and Docker Compose

### 1. Boot Services

```bash
docker compose up -d
```

Starts local PostgreSQL (`5432`) and Redis (`6379`) instances.

### 2. Configure Environment

Initialize configuration files from the templates:

```bash
cp backend/.env.example backend/.env
cp frontend-react/.env.example frontend-react/.env
```

> **Security Note:** Do not commit `.env` files. In production, configure secrets through container environment variables or your cloud secret provider.

### 3. Run Database Migrations

Apply schemas and sequential migration scripts:

```bash
PGPASSWORD=<pass> psql -h localhost -U save_user -d hetusafe \
  -f backend/migrations/schema.sql
# Then apply migration files in backend/migrations/ in filename order
```

### 4. Start Development Services

Terminal 1 (API Server):

```bash
cd backend
npm install
npm run dev
```

Terminal 2 (Frontend Client):

```bash
cd frontend-react
npm install
npm run dev
```

The interface will be live at `http://localhost:5173`.

---

## Automated Testing & CI

91 integration tests run against live PostgreSQL 15 and Redis 7 service containers on every push and pull request to `master` — so database and Redis integration behavior is exercised in CI.

```bash
cd backend

# Run the complete test suite
npm test

# Generate coverage breakdown
npm run test:coverage
```

### Test Scope

* **`auth.test.js` (28 tests):** Dual-step OTP verification, refresh token rotation, lockout escalations, and Redis revocation checks.
* **`reports.test.js` (24 tests):** Magic-byte verification, spatial deduplication checks, trust delta calculation, and atomic 6-hour deletion mechanics.
* **`admin.test.js` (39 tests):** Role-based access gates, double-submit CSRF enforcement, rate-limit thresholds, and audit logging.

---

## Deployment Pipeline

* **Continuous Integration:** Every commit to `master` triggers the 91-test integration suite inside isolated container runners.
* **Build Gate:** Passing test steps trigger the production bundle compilation (`vite build`).
* **Continuous Delivery:** After a successful build, the deployment workflow triggers the Render deploy hook for the backend service.

---

## Systems Roadmap

* [ ] **Multi-instance real-time delivery:** Add `@socket.io/redis-adapter` so Socket.io events can propagate across multiple backend instances.
* [ ] **Spatial indexing:** Replace the current Haversine calculation with PostGIS `ST_DWithin` and a GiST spatial index as location data grows.
* [ ] **Service Worker Background Sync:** Implement Background Sync API primitives to queue offline incident reports and automatically flush them when network connectivity is restored.

---

## Author

**Rishwanth Reddy Adamala**

[GitHub](https://github.com/Rishwanth05) • [LinkedIn](https://www.linkedin.com/in/rishwanth-reddy/) • [Email](mailto:rishwanthreddy05@gmail.com)

All rights reserved. Contact the author for reuse permissions.
