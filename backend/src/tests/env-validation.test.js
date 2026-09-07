'use strict';

// Tests for the startup env-var validator (src/config/validateEnv.js).
// process.exit is mocked so the test runner doesn't actually exit.

const { validateEnv } = require('../config/validateEnv');

describe('validateEnv — hard-required variables', () => {
  let exitSpy;
  let savedEnv;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    savedEnv = { ...process.env };
  });

  afterEach(() => {
    exitSpy.mockRestore();
    // Restore the env to exactly what it was before the test
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
  });

  test('exits with 1 when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with 1 when CSRF_SECRET is missing', () => {
    delete process.env.CSRF_SECRET;
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with 1 when no database config is present (dev env)', () => {
    // Ensure we stay in dev mode so the dev-DB branch is taken
    process.env.NODE_ENV = 'development';
    delete process.env.DB_DEV_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_USER;
    delete process.env.DB_NAME;
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with 1 when no database config is present (production env)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_PROD_URL;
    delete process.env.DATABASE_URL;
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('does not exit when all required variables are present', () => {
    // .env.test (loaded by loadEnv.js) already sets JWT_SECRET, CSRF_SECRET,
    // and DB_DEV_URL, so no modifications needed here.
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('reports all missing required variables before exiting, not just the first', () => {
    delete process.env.JWT_SECRET;
    delete process.env.CSRF_SECRET;
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
    // Both missing vars should be reported
    const errorCalls = errSpy.mock.calls.map(c => c[0]);
    expect(errorCalls.some(m => m.includes('JWT_SECRET'))).toBe(true);
    expect(errorCalls.some(m => m.includes('CSRF_SECRET'))).toBe(true);
    errSpy.mockRestore();
  });
});
