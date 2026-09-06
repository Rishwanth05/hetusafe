-- M-5: missing indexes on reports and notifications.
--
-- Reports indexes use CREATE INDEX CONCURRENTLY to avoid locking the table
-- during the build — required for any table with live data.
-- CONCURRENTLY cannot run inside a transaction block. Run this file with:
--
--   psql "$DATABASE_URL" -f migrations/missing_indexes.sql
--
-- Do NOT wrap with BEGIN/COMMIT. Do NOT run via \i inside a transaction.

-- ── reports.user_id + created_at (composite) ─────────────────────────────────
--
-- Covers GET /my-reports: WHERE user_id = $1 ORDER BY created_at DESC
-- and badge count queries: WHERE user_id = $1.
-- The composite allows the planner to filter by user_id and satisfy the
-- ORDER BY in a single index scan, avoiding a separate sort step.
--
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_user_id_created_at
  ON reports (user_id, created_at DESC);

-- ── reports.status (single-column) ───────────────────────────────────────────
--
-- Covers landing-page and admin count queries:
--   WHERE status = 'resolved'  /  WHERE status = 'critical'
-- and the admin report filter: WHERE status = $1 ORDER BY created_at DESC.
-- Status is low-cardinality (~3 values), but at scale a btree index still
-- lets count queries avoid a full-table scan.
-- Not composite with created_at because the count queries use status alone,
-- and admin filtered reports are a low-frequency, admin-only path.
--
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_status
  ON reports (status);

-- ── reports.archived_at + created_at (partial, WHERE archived_at IS NULL) ────
--
-- Covers GET /all and GET /nearby:
--   WHERE archived_at IS NULL  ORDER BY created_at DESC
-- Partial index predicate (archived_at IS NULL) keeps the index small —
-- only non-archived rows are stored — and lets the planner use it directly
-- for the IS NULL filter without an extra predicate check.
-- This covers both the archived_at and created_at index requirements.
--
-- Note: a plain btree index ON reports(archived_at) would have near-zero
-- selectivity (most rows are NULL), so a partial index is strictly correct.
--
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_active_created_at
  ON reports (created_at DESC)
  WHERE archived_at IS NULL;

-- ── reports.hazard_type + created_at (composite) ─────────────────────────────
--
-- Covers POST /check-duplicate inner scan:
--   WHERE hazard_type = $3
--     AND created_at > NOW() - INTERVAL '24 hours'
-- These two columns are always filtered together in this query and nowhere
-- else where btree is useful (admin search uses ILIKE, which btree cannot
-- satisfy). Composite lets the planner use hazard_type equality + created_at
-- range in a single index scan.
--
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_hazard_type_created_at
  ON reports (hazard_type, created_at);

-- ── notifications.deleted_at (partial, WHERE deleted_at IS NULL) ──────────────
--
-- Covers GET /notifications, GET /unread-count, DELETE /clear-all, DELETE /:id:
-- all filter WHERE deleted_at IS NULL ORDER BY created_at DESC.
-- Partial index keeps only active (non-deleted) rows, making it small and
-- directly usable for the deleted_at IS NULL predicate.
--
-- A plain btree index ON notifications(deleted_at) would have near-zero
-- selectivity once soft-deleted rows accumulate (vast majority would be
-- IS NULL), so a partial index is the correct approach.
--
CREATE INDEX IF NOT EXISTS idx_notifications_active_created_at
  ON notifications (created_at DESC)
  WHERE deleted_at IS NULL;
