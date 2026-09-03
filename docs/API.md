# Hetusafe API Reference

All routes are prefixed with `/api/v1/` unless noted.

**Authentication:** Protected routes require `Authorization: Bearer <token>`.
**CSRF:** State-changing routes require a valid `X-CSRF-Token` header (double-submit cookie pattern). Obtain the token from `GET /api/csrf-token`.

---

## Auth `/api/v1/auth`

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

---

## Reports `/api/v1/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/all` | ✓ | All active reports (cached 30 s in Redis) |
| POST | `/create` | ✓ | Submit a report; optional image upload to S3 |
| POST | `/resolve` | ✓ | Mark resolved with proof photo |
| POST | `/check-duplicate` | — | 50 m / 24 hr duplicate check |
| GET | `/trust/:userId` | — | Trust score and badge tier for a user |
| GET | `/:id/votes` | ✓ | Vote counts + current user's vote |
| POST | `/:id/vote` | ✓ | Cast or change vote (confirmed / disputed) |
| DELETE | `/:id` | ✓ | Delete own report (within 6-hour submission window) |

---

## Admin `/api/v1/admin` *(requires admin role)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard counts + recent reports + 7-day chart |
| GET | `/users` | Paginated user list with search |
| DELETE | `/users/:id` | Delete user (nullifies their reports) |
| PUT | `/users/:id/role` | Change user role (user / admin) |
| GET | `/reports` | Paginated report list with status/severity filter |
| GET | `/reports/deleted` | User-deleted reports from the last 24 hours (admin review window) |
| PUT | `/reports/:id/status` | Update report status; logs to audit trail |
| DELETE | `/reports/:id` | Delete report |
| GET | `/analytics` | 30-day charts: by day, category, severity, resolution time |
| POST | `/broadcast` | Create notification visible to all users |
| GET | `/audit-log` | Paginated admin action log |

---

## Badges & Leaderboard `/api/v1/badges`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | ✓ | Current user's earned badges and stats |
| GET | `/leaderboard` | — | Top 20 contributors by score |

---

## Notifications `/api/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Latest 30 notifications for this user; rows include `report_id` (nullable) used for deep-linking to the source report |
| GET | `/unread-count` | ✓ | Count of unread notifications since last read |
| PUT | `/read-all` | ✓ | Mark all notifications as read |
| DELETE | `/clear-all` | ✓ | Soft-delete all visible notifications |
| DELETE | `/:id` | ✓ | Soft-delete a single notification |

---

## Master Data `/api/v1/master`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | — | Active hazard categories |
| GET | `/severities` | — | Active severity levels |
| GET | `/statuses` | — | Active report statuses |
| POST | `/categories` | admin | Create hazard category |
| PATCH | `/categories/:id/toggle` | admin | Enable / disable a category |

---

## Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/csrf-token` | — | Get double-submit CSRF token (also sets cookie) |
| GET | `/api/v1/public/stats` | — | Public stats for landing page |
| POST | `/api/v1/contact/send` | — | Send contact-form message via SendGrid |
