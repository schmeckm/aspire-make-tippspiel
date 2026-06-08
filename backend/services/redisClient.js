let redisClient = null;
let redisReady = false;
let connectPromise = null;

function initRedis() {
  if (redisClient || !process.env.REDIS_URL) return;
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    connectPromise = redisClient.connect?.()
      .then(() => {
        redisReady = true;
        console.log('Redis connected');
      })
      .catch((error) => {
        console.warn('Redis unavailable, using in-memory OAuth store:', error.message);
        redisClient = null;
        redisReady = false;
      });
  } catch {
    redisClient = null;
    redisReady = false;
  }
}

initRedis();

function isRedisReady() {
  return Boolean(redisClient && redisReady);
}

async function ensureRedis() {
  if (connectPromise) await connectPromise;
  return isRedisReady();
}

async function redisGet(key) {
  if (!(await ensureRedis())) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

async function redisSet(key, value, ttlMs) {
  if (!(await ensureRedis())) return false;
  try {
    if (ttlMs) {
      await redisClient.set(key, value, 'PX', ttlMs);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

async function redisDel(key) {
  if (!(await ensureRedis())) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
}

function resetForTests() {
  redisClient = null;
  redisReady = false;
  connectPromise = null;
}

module.exports = {
  isRedisReady,
  ensureRedis,
  redisGet,
  redisSet,
  redisDel,
  resetForTests,
};
