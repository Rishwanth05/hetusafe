'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Loads .env.test before any module is require()'d in test files
  setupFiles: ['./src/tests/loadEnv.js'],
  globalSetup: './src/tests/globalSetup.js',
  globalTeardown: './src/tests/globalTeardown.js',
  // Regex keys match the module-path string as written in require() / import().
  //   firebase  — required as '../config/firebase' from src/routes/
  //   client-s3 — bare package name
  //   file-type — ESM-only; replaced with CJS mock so import() works in Jest
  moduleNameMapper: {
    'config/firebase(\\.js)?$': '<rootDir>/src/tests/__mocks__/firebase.js',
    '^@aws-sdk/client-s3$': '<rootDir>/src/tests/__mocks__/client-s3.js',
    '^file-type$': '<rootDir>/src/tests/__mocks__/file-type.js',
  },
  testTimeout: 15000,
  verbose: true,
};
