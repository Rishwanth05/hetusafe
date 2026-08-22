require('dotenv').config();

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

require('./db');

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// NOTIF3 — background cleanup job
const { startCleanupJob } = require('./jobs/cleanupNotifications');
const { startDailyBackup } = require('./jobs/dailyBackup');

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
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// RT-1 — Make io accessible in routes via app
app.set('io', io);

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
