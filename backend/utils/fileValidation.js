const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function readBufferHead(filePath, length = 12) {
  const fs = require('fs');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, 0);
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

function matchesSignature(buffer, signature) {
  return signature.bytes.every((byte, index) => buffer[index] === byte);
}

function validateImageFile(file) {
  if (!file) return { ok: false, error: 'INVALID_IMAGE' };

  const ext = (file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'INVALID_IMAGE' };
  }

  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return { ok: false, error: 'INVALID_IMAGE' };
  }

  const path = file.path;
  if (!path) return { ok: true };

  try {
    const head = readBufferHead(path);
    const valid = IMAGE_SIGNATURES.some((sig) => matchesSignature(head, sig));
    if (!valid) return { ok: false, error: 'INVALID_IMAGE' };
  } catch {
    return { ok: false, error: 'INVALID_IMAGE' };
  }

  return { ok: true };
}

module.exports = {
  ALLOWED_IMAGE_EXTENSIONS,
  validateImageFile,
};
