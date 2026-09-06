-- Rollback for missing_indexes.sql
-- Drop all five indexes added by that migration.
-- Run with: psql "$DATABASE_URL" -f migrations/missing_indexes_rollback.sql

DROP INDEX CONCURRENTLY IF EXISTS idx_reports_user_id_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_reports_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_reports_active_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_reports_hazard_type_created_at;
DROP INDEX IF EXISTS idx_notifications_active_created_at;
