'use strict';

const http = require('http');
const { Server: SocketServer } = require('socket.io');
const { io: ioc } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../db');
const redis = require('../config/redis');
const socketAuth = require('../middleware/socketAuth');

// ── Test server setup ─────────────────────────────────────────────────────────
// We spin up a real HTTP server on a random port and attach socket.io with the
// same socketAuth middleware used in production server.js. This lets us test
// the auth behaviour directly without importing server.js (which starts a
// server on a fixed port and cannot be safely imported in tests).

let httpServer;
let serverUrl;

beforeAll((done) => {
  httpServer = http.createServer(app);
  const ioServer = new SocketServer(httpServer, {
    cors: { origin: '*' },
  });
  ioServer.use(socketAuth);
  ioServer.on('connection', () => {});
  httpServer.listen(0, () => {
    serverUrl = `http://localhost:${httpServer.address().port}`;
    done();
  });
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  await pool.end();
  redis.disconnect();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToken(payload = {}, secret = process.env.JWT_SECRET) {
  return jwt.sign(
    { id: 1, email: 'socktest@example.com', role: 'user', ...payload },
    secret,
    { expiresIn: '1h' }
  );
}

// Promisified socket connection: resolves with socket on connect, rejects with
// the connect_error. Always cleans up the socket regardless of outcome.
function connect(opts) {
  return new Promise((resolve, reject) => {
    const socket = ioc(serverUrl, { forceNew: true, reconnection: false, ...opts });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => { socket.close(); reject(err); });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Socket.io connection auth', () => {
  test('rejects connection with no token', async () => {
    await expect(connect()).rejects.toThrow(/authentication required/i);
  });

  test('rejects connection with an invalid token', async () => {
    await expect(
      connect({ auth: { token: 'not.a.real.token' } })
    ).rejects.toThrow(/invalid or expired token/i);
  });

  test('rejects connection with a token signed by the wrong secret', async () => {
    const badToken = makeToken({}, 'wrong-secret');
    await expect(
      connect({ auth: { token: badToken } })
    ).rejects.toThrow(/invalid or expired token/i);
  });

  test('accepts connection with a valid JWT', async () => {
    const token = makeToken();
    const socket = await connect({ auth: { token } });
    expect(socket.connected).toBe(true);
    socket.close();
  });
});
