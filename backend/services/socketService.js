let io = null;

function init(server, options = {}) {
  const { Server } = require('socket.io');
  const { verifyToken } = require('../utils/jwtUtils');
  const { getSocketCorsOrigin } = require('../config/corsConfig');

  io = new Server(server, {
    cors: {
      origin: options.corsOrigin ?? getSocketCorsOrigin(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
      || socket.handshake.query?.token;
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return next(new Error('Unauthorized'));
    }
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('join', (userId) => {
      const requestedId = parseInt(userId, 10);
      if (requestedId === socket.userId) {
        socket.join(`user:${requestedId}`);
      }
    });

    socket.on('join-leaderboard', () => {
      socket.join('leaderboard');
    });

    socket.on('join-matches', () => {
      socket.join('matches');
    });
  });

  return io;
}

function emitToUser(userId, event, data) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

function emitToMatches(event, data) {
  if (io) io.to('matches').emit(event, data);
}

function emitToLeaderboard(event, data) {
  if (io) io.to('leaderboard').emit(event, data);
}

function broadcast(event, data) {
  if (io) io.emit(event, data);
}

function getIO() {
  return io;
}

module.exports = {
  init,
  emitToUser,
  emitToMatches,
  emitToLeaderboard,
  broadcast,
  getIO,
};
