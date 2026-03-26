const authenticateSocket = require('./authMiddleware');
const registerGameHandlers = require('./handlers/game');

const initSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.user.userId})`);

    registerGameHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (user ${socket.user.userId})`);
    });
  });
};

module.exports = initSocket;
