require('dotenv').config();
require('./config/validateEnv').validateEnv();

// Sentry must initialise before any other require; only load when DSN is set.
// Note: require('@sentry/node') hangs in WSL2 due to OTLP probing on localhost:4318
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

const { startCleanupJob } = require('./jobs/cleanupNotifications');
const { startDailyBackup } = require('./jobs/dailyBackup');
const socketAuth = require('./middleware/socketAuth');

const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const PORT = process.env.PORT || 5000;

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
  startCleanupJob();
  startDailyBackup();
  console.log('[backup] Daily backup cron scheduled for 2AM');
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
// Render sends SIGTERM then waits 30s before SIGKILL. We drain HTTP and
// WebSocket connections first, then close DB and Redis, within 25s.
const SHUTDOWN_TIMEOUT_MS = 25_000;

function gracefulShutdown(signal) {
  console.log(`[shutdown] ${signal} received — draining connections...`);

  // De-register to prevent a second signal from racing with cleanup.
  process.off('SIGTERM', onSIGTERM);
  process.off('SIGINT',  onSIGINT);

  // 1. Close Socket.io first — open WS connections would prevent server.close() from firing.
  io.close();

  // 2. Stop accepting new connections; wait for in-flight requests to finish.
  server.close(async () => {
    console.log('[shutdown] HTTP server closed');
    try {
      // 3. Close the DB pool after requests have drained.
      await pool.end();
      console.log('[shutdown] PostgreSQL pool closed');
      // 4. Quit Redis gracefully.
      await redis.quit();
      console.log('[shutdown] Redis disconnected');
    } catch (err) {
      console.error('[shutdown] Cleanup error:', err.message);
    }
    console.log('[shutdown] Clean exit');
    process.exit(0);
  });

  // 5. Hard deadline — exits before Render's SIGKILL.
  setTimeout(() => {
    console.error('[shutdown] Grace period exceeded — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

const onSIGTERM = () => gracefulShutdown('SIGTERM');
const onSIGINT  = () => gracefulShutdown('SIGINT');
process.on('SIGTERM', onSIGTERM);
process.on('SIGINT',  onSIGINT);
