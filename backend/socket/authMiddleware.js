const jwt = require('jsonwebtoken');

// Socket.IO middleware that verifies the JWT passed in socket.handshake.auth.token.
// Attaches the decoded user payload to socket.user so game handlers can identify the caller.
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new Error('Invalid or expired token'));
    }
    socket.user = user;
    next();
  });
};

module.exports = authenticateSocket;
