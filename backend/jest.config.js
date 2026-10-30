'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Loads .env.test before any module is require()'d in test files
  setupFiles: ['./src/tests/loadEnv.js'],
  globalSetup: './src/tests/globalSetup.js',
  globalTeardown: './src/tests/globalTeardown.js',
  // Regex keys match the module-path string as written in require() / import().
  //   firebase   — required as '../config/firebase' from src/routes/
  //   client-s3  — bare package name
  //   imageType  — CJS wrapper around the ESM-only file-type package;
  //                intercepted here so tests work without --experimental-vm-modules
  moduleNameMapper: {
    'config/firebase(\\.js)?$': '<rootDir>/src/tests/__mocks__/firebase.js',
    '^@aws-sdk/client-s3$': '<rootDir>/src/tests/__mocks__/client-s3.js',
    'lib/imageType(\\.js)?$': '<rootDir>/src/tests/__mocks__/imageType.js',
  },
  testTimeout: 15000,
  verbose: true,
  // ── MITIGATION: RC-2/RC-3 test-isolation ──────────────────────────────────
  // auth.test.js, reports.test.js, and admin.test.js all run TRUNCATE on
  // overlapping table sets in beforeEach, against the same Postgres database.
  // When Jest runs these files concurrently (its default), one file's TRUNCATE
  // destroys rows that a parallel file's test just inserted, causing FK
  // violations, deadlocks, and stale-read failures (23 failures observed).
  // The authLimiter Redis counter is also shared across workers, causing 429
  // errors when concurrent auth requests exhaust the 20 req/15 min budget.
  //
  // maxWorkers: 1 serialises file execution so no two test files run at the
  // same time, eliminating both failure modes. This matches what `npm test`
  // already does via --runInBand.
  //
  // This is a mitigation, not a fix. The proper long-term fix is Option B
  // (per-worker PostgreSQL schema isolation): create one schema per Jest worker
  // in globalSetup, route each worker's pool to its schema via search_path in
  // setupFiles using JEST_WORKER_ID, and drop schemas in globalTeardown. That
  // eliminates shared-table interference without sacrificing parallel speed.
  // Tracked as follow-up work.
  maxWorkers: 1,
};
