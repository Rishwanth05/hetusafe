const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Sentry = process.env.SENTRY_DSN ? require('@sentry/node') : null;
const path = require('path');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const pool  = require('./db');
const redis = require('./config/redis');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const contactRoutes = require('./routes/contactRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const publicRoutes = require('./routes/publicRoutes');
const masterDataRoutes = require('./routes/masterDataRoutes');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ message: 'Hetusafe backend ✅' }));

// ── Health check ──────────────────────────────────────────────────────────────
// Render and UptimeRobot poll this endpoint. Must reflect real dependency
// health: returning 200 when the DB or Redis is down masks outages from
// monitoring tools and makes deploys with bad config look healthy.
//
// Registered before the global rate limiter so monitoring traffic is never
// throttled and so the redis.status early-exit guard fires without first
// hitting the RedisStore-backed limiter.
//
// Each check races against a 2-second hard timeout so a dead dependency
// fails fast (503) instead of hanging and confusing Render's health-check
// timeout. Response body omits connection strings and stack traces — the
// endpoint is publicly reachable.
//
// Shutdown interaction (E-6): pool.end() sets pool.ended = true and
// redis.quit() sets redis.status = 'end' before any in-flight HTTP requests
// complete (server.close waits for them first). The early-exit check below
// catches this state and returns 503 so monitoring correctly shows the
// instance as going down rather than throwing on a closed pool.
const HEALTH_TIMEOUT_MS = 2000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

app.get('/health', async (req, res) => {
  const time = new Date().toISOString();

  // Detect graceful-shutdown state — pool.ended is true after pool.end(),
  // redis.status is 'end' after redis.quit().
  if (pool.ended || redis.status === 'end') {
    return res.status(503).json({ status: 'shutting_down', time });
  }

  const [dbResult, redisResult] = await Promise.allSettled([
    withTimeout(pool.query('SELECT 1'), HEALTH_TIMEOUT_MS),
    withTimeout(redis.ping(),           HEALTH_TIMEOUT_MS),
  ]);

  const checks = {
    db:    dbResult.status    === 'fulfilled' ? 'ok' : dbResult.reason.message,
    redis: redisResult.status === 'fulfilled' ? 'ok' : redisResult.reason.message,
  };

  const healthy = checks.db === 'ok' && checks.redis === 'ok';
  return res
    .status(healthy ? 200 : 503)
    .json({ status: healthy ? 'ok' : 'degraded', time, checks });
});

// SEC7 — Global rate limit: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});
app.use(globalLimiter);

// SEC7 — Strict rate limit for auth routes: 20 requests per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Try again in 15 minutes.' },
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});

// POST /auth/refresh fires on every page load and on every 401 — it must not
// share authLimiter's budget. 60 req / 15 min gives normal sessions headroom
// while still capping abuse.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many refresh attempts. Try again in 15 minutes.' },
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});

// SEC4 — CSRF protection on all state-changing routes (csrf-csrf double-submit cookie)
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: () => '',
  cookieName: '_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Hetusafe API', version: '1.0.0' },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['./src/routes/*.js'],
});
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

// SEC4 — expose CSRF token to frontend (generateCsrfToken sets cookie + returns token)
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

// authLimiter applied per-route rather than to the full /auth prefix:
//   /login      → has its own loginLimiter (10/15min) in authRoutes.js
//   /resend-otp → has its own otpLimiter   (3/30min)  in authRoutes.js
//   /refresh    → gets refreshLimiter below; stacking authLimiter on top
//                 would reproduce the original 429-on-page-load bug
app.use([
  '/api/v1/auth/signup',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/verify-login',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/logout',
], authLimiter);
app.post('/api/v1/auth/refresh', refreshLimiter);
app.use('/api/v1/auth', doubleCsrfProtection, authRoutes);
app.use('/api/v1/reports', doubleCsrfProtection, reportRoutes);
app.use('/api/v1/contact', doubleCsrfProtection, contactRoutes);
app.use('/api/v1/badges', doubleCsrfProtection, badgeRoutes);
app.use('/api/v1/admin', doubleCsrfProtection, adminRoutes);
app.use('/api/v1/notifications', doubleCsrfProtection, notificationRoutes);
// LAND-2 — Public stats, no CSRF/auth needed (must be before 404 handler)
app.use('/api/v1/public', publicRoutes);
// DB4 — Master data (GET public, POST/PATCH admin-only via route-level auth)
app.use('/api/v1/master', masterDataRoutes);

// MON1 — Sentry error handler (must be before other error middleware)
if (Sentry) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN')
    return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
  console.error('❌', err.message);
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(err.status || 500).json({ error: { message } });
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

module.exports = app;