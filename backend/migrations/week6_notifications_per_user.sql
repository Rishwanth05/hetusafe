-- NOTIF-PU — Per-user notification targeting
--
-- Adds a nullable user_id column to notifications:
--   user_id IS NULL  → visible to ALL authenticated users (proximity_alert, broadcast)
--   user_id = <id>   → visible ONLY to that user (resolved, future personal events)
--
-- Existing rows have no user_id and will receive NULL, keeping them visible to all
-- users — this is the correct behaviour for the historical proximity_alert and
-- broadcast rows that were already global.
--
-- The GET /notifications endpoint is updated (separately, in notificationRoutes.js)
-- to filter:  WHERE deleted_at IS NULL AND (user_id = $req_user OR user_id IS NULL)
--
-- Run this migration against dev first; do NOT run against production until reviewed.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Efficient per-user lookup; NULL values are stored but filtered separately
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id)
  WHERE user_id IS NOT NULL;

-- Already queried DESC by the GET endpoint; add index if not present
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);
