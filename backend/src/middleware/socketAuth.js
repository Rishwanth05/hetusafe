'use strict';

const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

// Socket.io io.use() middleware — validates the JWT token supplied in the
// handshake auth object before allowing the connection to be established.
async function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new Error('Invalid or expired token'));
  }

  // Fail-open: if Redis is briefly unavailable the blacklist check is skipped
  // rather than rejecting a valid connection. Tokens expire within 15 min anyway.
  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      return next(new Error('Token invalidated'));
    }
  } catch {
    console.error('socketAuth: Redis blacklist check failed, continuing');
  }

  socket.user = decoded;
  next();
}

module.exports = socketAuth;
