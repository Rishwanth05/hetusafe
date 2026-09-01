-- Archive table for user-deleted reports.
-- Rows enter here when a user self-deletes within the 6-hour window.
-- A scheduled purge job (separate task, not in scope) removes rows older than 24 hours.

CREATE TABLE IF NOT EXISTS deleted_reports (
  -- Original report ID is stored as a plain integer — no FK to reports because
  -- the source row is hard-deleted before this row is committed.
  id                  INTEGER        NOT NULL,
  user_id             INTEGER,                          -- original reporter (no FK; user may be deleted later)
  title               VARCHAR(200),
  hazard_type         VARCHAR(50)    NOT NULL,
  custom_description  TEXT,
  severity            VARCHAR(20)    NOT NULL,
  description         TEXT           NOT NULL,
  latitude            NUMERIC(10, 7) NOT NULL,
  longitude           NUMERIC(10, 7) NOT NULL,
  location_method     VARCHAR(20)    DEFAULT 'gps',
  image_url           TEXT,
  status              VARCHAR(30)    DEFAULT 'active',
  confirmation_count  INTEGER        DEFAULT 0,
  flag_count          INTEGER        DEFAULT 0,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,

  -- Audit columns
  deleted_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  -- ON DELETE SET NULL so admin user deletions don't block
  deleted_by          INTEGER        REFERENCES users(id) ON DELETE SET NULL,

  PRIMARY KEY (id)
);

-- Supports the admin 24-hour window query efficiently.
CREATE INDEX IF NOT EXISTS idx_deleted_reports_deleted_at
  ON deleted_reports (deleted_at DESC);
