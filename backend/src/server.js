require('dotenv').config();
require('./config/validateEnv').validateEnv();

// MON1 — Sentry must initialise before any other require; only load when DSN is set
// (require('@sentry/node') hangs in WSL2 due to OTLP endpoint probing on localhost:4318)
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

const pool  = require('./db');
const redis = require('./config/redis');

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// NOTIF3 — background cleanup job
const { startCleanupJob } = require('./jobs/cleanupNotifications');
const { startDailyBackup } = require('./jobs/dailyBackup');
const socketAuth = require('./middleware/socketAuth');

const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const PORT = process.env.PORT || 5000;

// RT-1 — Create HTTP server and attach Socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
        : []),
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// RT-1 — Make io accessible in routes via app
app.set('io', io);

// Reject connections that don't supply a valid JWT at handshake time.
io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Hetusafe backend running at http://localhost:${PORT}`);
  // NOTIF3 — start background jobs after server is up
  startCleanupJob();
  startDailyBackup();
  console.log('[backup] Daily backup cron scheduled for 2AM');
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
// Render sends SIGTERM before terminating and waits 30 s before SIGKILL.
// We drain HTTP + WebSocket connections first, then close DB and Redis,
// all within a 25 s window to stay well inside that limit.
const SHUTDOWN_TIMEOUT_MS = 25_000;

function gracefulShutdown(signal) {
  console.log(`[shutdown] ${signal} received — draining connections...`);

  // De-register so a second signal doesn't race with cleanup.
  process.off('SIGTERM', onSIGTERM);
  process.off('SIGINT',  onSIGINT);

  // 1. Stop Socket.io connections — without this, server.close() may never
  //    fire its callback because WebSocket connections keep the server active.
  io.close();

  // 2. Stop accepting new HTTP connections; wait for in-flight requests.
  server.close(async () => {
    console.log('[shutdown] HTTP server closed');
    try {
      // 3. Close the PostgreSQL pool after all requests have drained, so no
      //    in-flight request hits a closed pool and gets a 500.
      await pool.end();
      console.log('[shutdown] PostgreSQL pool closed');
      // 4. Gracefully quit Redis (lets in-flight commands complete).
      await redis.quit();
      console.log('[shutdown] Redis disconnected');
    } catch (err) {
      console.error('[shutdown] Cleanup error:', err.message);
    }
    console.log('[shutdown] Clean exit');
    process.exit(0);
  });

  // 5. Hard deadline — exits before Render force-kills with SIGKILL.
  setTimeout(() => {
    console.error('[shutdown] Grace period exceeded — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

const onSIGTERM = () => gracefulShutdown('SIGTERM');
const onSIGINT  = () => gracefulShutdown('SIGINT');
process.on('SIGTERM', onSIGTERM);
process.on('SIGINT',  onSIGINT);
