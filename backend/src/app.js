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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
}));

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ message: 'Hetusafe backend ✅' }));

// ── Health check ──────────────────────────────────────────────
// Registered before globalLimiter so monitoring polls aren't throttled.
// Returns 503 when any dependency is down, and during graceful shutdown —
// a 200 with a dead DB would look healthy to Render/UptimeRobot.
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

  // Returns 503 during graceful shutdown so monitoring sees the instance going down.
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

// 100 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});
app.use(globalLimiter);

// Tighter limit for auth endpoints: 20 req per 15 min
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

// Contact form: low-frequency user action — 5 submissions per 15 min per IP.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many contact requests. Please try again later.' },
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});

// Double-submit cookie CSRF protection
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

// Expose CSRF token so the frontend can include it in X-CSRF-Token headers
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

// authLimiter is applied per-route, not to the full /auth prefix:
// /login and /resend-otp have their own tighter limiters in authRoutes.js;
// /refresh gets refreshLimiter (separate budget — stacking authLimiter caused 429 on page load)
app.use([
  '/api/v1/auth/signup',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/verify-login',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/logout',
], authLimiter);
app.post('/api/v1/auth/refresh', refreshLimiter);
app.post('/api/v1/contact/send', contactLimiter);
app.use('/api/v1/auth', doubleCsrfProtection, authRoutes);
app.use('/api/v1/reports', doubleCsrfProtection, reportRoutes);
app.use('/api/v1/contact', doubleCsrfProtection, contactRoutes);
app.use('/api/v1/badges', doubleCsrfProtection, badgeRoutes);
app.use('/api/v1/admin', doubleCsrfProtection, adminRoutes);
app.use('/api/v1/notifications', doubleCsrfProtection, notificationRoutes);
// Must be before the 404 handler
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/master', masterDataRoutes);

// Sentry error handler must be before other error middleware
if (Sentry) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN')
    return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
  if (err.type === 'entity.too.large')
    return res.status(413).json({ error: 'Request body too large.' });
  console.error('❌', err.message);
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(err.status || 500).json({ error: message });
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

module.exports = app;