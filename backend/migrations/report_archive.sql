-- Additive migration: add nullable archived_at column to reports.
-- NULL = not archived (default); non-NULL = archived timestamp.
-- No existing rows are changed; new column defaults to NULL for all of them.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
