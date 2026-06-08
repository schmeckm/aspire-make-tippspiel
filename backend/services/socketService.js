let io = null;

async function authenticateSocket(socket) {
  const { verifyToken } = require('../utils/jwtUtils');
  const { isTokenBlacklisted } = require('./tokenBlacklistService');
  const { User } = require('../models');

  const token = socket.handshake.auth?.token
    || socket.handshake.query?.token;
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    socket.authenticated = false;
    return;
  }

  if (await isTokenBlacklisted(token)) {
    socket.authenticated = false;
    return;
  }

  const user = await User.findByPk(decoded.userId, { attributes: ['id', 'role'] });
  if (!user) {
    socket.authenticated = false;
    return;
  }

  socket.userId = user.id;
  socket.userRole = user.role;
  socket.authenticated = true;
}

async function init(server, options = {}) {
  const { Server } = require('socket.io');
  const { getSocketCorsOrigin } = require('../config/corsConfig');

  io = new Server(server, {
    cors: {
      origin: options.corsOrigin ?? getSocketCorsOrigin(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const Redis = require('ioredis');
      const pubClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.IO] Redis adapter enabled.');
    } catch (error) {
      console.warn('[Socket.IO] Redis adapter unavailable:', error.message);
    }
  }

  io.use(async (socket, next) => {
    try {
      await authenticateSocket(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    if (socket.authenticated) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('join', (userId) => {
      const requestedId = parseInt(userId, 10);
      if (requestedId === socket.userId) {
        socket.join(`user:${requestedId}`);
      }
    });

    socket.on('join-leaderboard', () => {
      if (!socket.authenticated) return;
      socket.join('leaderboard');
    });

    socket.on('join-matches', () => {
      if (!socket.authenticated) return;
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
