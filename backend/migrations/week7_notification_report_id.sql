-- Link notifications to the report they're about.
-- ON DELETE SET NULL: if the report is later hard-deleted (e.g. via the
-- delete-report feature), the notification row survives with report_id = NULL
-- rather than being removed. Existing rows stay NULL — no backfill needed.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL;
