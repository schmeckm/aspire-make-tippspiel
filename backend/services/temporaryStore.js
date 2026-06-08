const { redisGet, redisSet, redisDel } = require('./redisClient');

const memoryStore = new Map();

async function set(key, value, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  memoryStore.set(key, { value, expiresAt });
  const payload = JSON.stringify({ value, expiresAt });
  await redisSet(key, payload, ttlMs);
}

async function get(key) {
  const raw = await redisGet(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed.value;
    } catch {
      return null;
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

async function del(key) {
  await redisDel(key);
  memoryStore.delete(key);
}

function cleanupMemory(prefix) {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (prefix && !key.startsWith(prefix)) continue;
    if (now > entry.expiresAt) memoryStore.delete(key);
  }
}

function resetForTests() {
  memoryStore.clear();
}

module.exports = { set, get, del, cleanupMemory, resetForTests };
