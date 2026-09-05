'use strict';

const jwt = require('jsonwebtoken');

// Socket.io io.use() middleware — validates the JWT token supplied in the
// handshake auth object before allowing the connection to be established.
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuth;
