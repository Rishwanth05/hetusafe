'use strict';

// Shared settings used by both projects below.
const sharedProject = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/tests/loadEnv.js'],
  testTimeout: 15000,
  verbose: true,
};

module.exports = {
  // globalSetup / globalTeardown run once for the entire Jest run regardless
  // of how many projects are configured.
  globalSetup: './src/tests/globalSetup.js',
  globalTeardown: './src/tests/globalTeardown.js',

  projects: [
    {
      ...sharedProject,
      displayName: 'suite',
      // All integration tests — config/firebase is replaced by a jest.fn() stub
      // so tests do not make real FCM calls.
      testMatch: ['<rootDir>/src/tests/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/', 'firebaseConfig\\.test\\.js'],
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
      // ── MITIGATION: RC-2/RC-3 test-isolation ────────────────────────────────
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
    },
    {
      ...sharedProject,
      displayName: 'firebase-unit',
      // Unit tests for src/config/firebase.js — loads the REAL module (config/firebase
      // is intentionally absent from moduleNameMapper here) and mocks firebase-admin
      // directly via jest.mock() in the test file.
      testMatch: ['<rootDir>/src/tests/firebaseConfig.test.js'],
      moduleNameMapper: {
        '^@aws-sdk/client-s3$': '<rootDir>/src/tests/__mocks__/client-s3.js',
        'lib/imageType(\\.js)?$': '<rootDir>/src/tests/__mocks__/imageType.js',
      },
    },
  ],
};
