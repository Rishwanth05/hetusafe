'use strict';

// Minimal server fixture for graceful-shutdown integration testing.
//
// Loads the real pool and redis from the project, starts a minimal HTTP server
// with Socket.io, then registers the same shutdown handler verbatim from
// server.js — without loading app.js / routes (firebase-admin, @aws-sdk,
// swagger-ui-express, etc. all hang in WSL2 outside Jest's module-mock env).

require('dotenv').config();
require('../../config/validateEnv').validateEnv();

const pool  = require('../../db');
const redis = require('../../config/redis');

const http = require('http');
const { Server } = require('socket.io');
const express = require('express');

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server);

const PORT = parseInt(process.env.PORT, 10) || 0;

const SHUTDOWN_TIMEOUT_MS = 25_000;

function gracefulShutdown(signal) {
  console.log(`[shutdown] ${signal} received — draining connections...`);

  process.off('SIGTERM', onSIGTERM);
  process.off('SIGINT',  onSIGINT);

  io.close();

  server.close(async () => {
    console.log('[shutdown] HTTP server closed');
    try {
      await pool.end();
      console.log('[shutdown] PostgreSQL pool closed');
      await redis.quit();
      console.log('[shutdown] Redis disconnected');
    } catch (err) {
      console.error('[shutdown] Cleanup error:', err.message);
    }
    console.log('[shutdown] Clean exit');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[shutdown] Grace period exceeded — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

const onSIGTERM = () => gracefulShutdown('SIGTERM');
const onSIGINT  = () => gracefulShutdown('SIGINT');
process.on('SIGTERM', onSIGTERM);
process.on('SIGINT',  onSIGINT);

server.on('error', (err) => {
  console.error('[fixture] server error:', err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  const actual = server.address().port;
  console.log(`Hetusafe backend running at http://localhost:${actual}`);
});
