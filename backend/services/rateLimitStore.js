const memoryStore = new Map();

let redisClient = null;
let redisReady = false;

function initRedis() {
  if (redisClient || !process.env.REDIS_URL) return;
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redisClient.connect?.().then(() => {
      redisReady = true;
    }).catch(() => {
      redisClient = null;
      redisReady = false;
    });
  } catch {
    redisClient = null;
    redisReady = false;
  }
}

initRedis();

async function getEntry(key) {
  if (redisClient && redisReady) {
    try {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // fall through to memory
    }
  }
  return memoryStore.get(key) || null;
}

async function setEntry(key, entry, ttlMs) {
  if (redisClient && redisReady) {
    try {
      await redisClient.set(key, JSON.stringify(entry), 'PX', ttlMs);
      return;
    } catch {
      // fall through to memory
    }
  }
  memoryStore.set(key, entry);
}

function resetForTests() {
  memoryStore.clear();
}

module.exports = {
  getEntry,
  setEntry,
  resetForTests,
};
