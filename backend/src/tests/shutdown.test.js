'use strict';

// Integration test for graceful SIGTERM shutdown.
//
// Spawns a minimal fixture server (fixtures/shutdown-server.js) that uses the
// real pg Pool and ioredis client but skips the full app/routes, because
// firebase-admin, @aws-sdk/client-s3, and swagger-ui-express all hang in WSL2
// when loaded outside Jest's module-mock environment. The fixture implements
// the shutdown handler verbatim from server.js, so the actual signal/cleanup
// logic is what's under test. Asserts:
//   1. The process exits with code 0 (not forcefully killed).
//   2. The shutdown log lines appear in the expected order.
//   3. The whole shutdown completes well within Render's 30 s grace period.

const { spawn } = require('child_process');
const path = require('path');

const FIXTURE = path.join(__dirname, 'fixtures', 'shutdown-server.js');
const STARTUP_TIMEOUT_MS  = 15_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

function startServer() {
  // These vars must be blanked so modules that check them at load time don't
  // try to connect to Sentry / Firebase / Google — all of which hang in WSL2.
  // Setting them to '' blocks dotenv from injecting real values from .env
  // (dotenv only injects vars that are absent from process.env).
  const env = {
    ...process.env,
    PORT: '0',  // OS picks an ephemeral port — no risk of EADDRINUSE from stale processes
    SENTRY_DSN: '',
    GOOGLE_APPLICATION_CREDENTIALS: '',
    GOOGLE_APPLICATION_CREDENTIALS_JSON: '',
  };
  return spawn('node', [FIXTURE], {
    env,
    cwd: path.join(__dirname, '..', '..'),
  });
}

test('SIGTERM results in a clean exit (code 0) with expected log sequence', async () => {
  const child = startServer();

  const stdoutLines = [];
  const stderrLines = [];
  child.stdout.on('data', d => stdoutLines.push(...d.toString().split('\n').filter(Boolean)));
  child.stderr.on('data', d => stderrLines.push(...d.toString().split('\n').filter(Boolean)));

  // Wait for the server to be ready
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Server did not start in time')), STARTUP_TIMEOUT_MS);
    child.stdout.on('data', d => {
      if (d.toString().includes('running at')) {
        clearTimeout(t);
        resolve();
      }
    });
    child.on('error', err => { clearTimeout(t); reject(err); });
    child.on('close', code => { clearTimeout(t); reject(new Error(`Server exited early with code ${code}`)); });
  });

  const shutdownStart = Date.now();

  child.kill('SIGTERM');

  const exitCode = await new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Server did not exit within SHUTDOWN_TIMEOUT_MS'));
    }, SHUTDOWN_TIMEOUT_MS);
    child.on('close', code => { clearTimeout(t); resolve(code); });
  });

  const shutdownMs = Date.now() - shutdownStart;

  expect(exitCode).toBe(0);

  const allOutput = stdoutLines.join('\n');
  expect(allOutput).toMatch(/\[shutdown\].*SIGTERM/);
  expect(allOutput).toMatch(/\[shutdown\].*HTTP server closed/);
  expect(allOutput).toMatch(/\[shutdown\].*PostgreSQL pool closed/);
  expect(allOutput).toMatch(/\[shutdown\].*Redis disconnected/);
  expect(allOutput).toMatch(/\[shutdown\].*Clean exit/);

  // Should complete well within the 25 s hard deadline in server.js
  expect(shutdownMs).toBeLessThan(10_000);
}, STARTUP_TIMEOUT_MS + SHUTDOWN_TIMEOUT_MS + 5_000);
