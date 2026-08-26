-- Speeds up the Haversine distance scan in GET /reports/nearby.
-- IF NOT EXISTS makes this idempotent; safe on the current low row count
-- without needing CONCURRENTLY.
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng
  ON public.reports (latitude, longitude);
