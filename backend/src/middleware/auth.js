const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = auth.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Fail-open: if Redis is briefly unavailable the blacklist check is skipped
  // rather than returning a spurious 401. Tokens expire within 15 min anyway.
  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ message: 'Token invalidated' });
    }
  } catch {
    console.error('verifyToken: Redis blacklist check failed, continuing');
  }

  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
