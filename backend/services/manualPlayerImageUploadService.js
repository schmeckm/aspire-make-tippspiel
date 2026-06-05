const fs = require('fs');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function getPlayersUploadDir() {
  const dir = path.join(__dirname, '..', 'uploads', 'players');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveExtension(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) return ext;
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return mimeMap[file.mimetype] || null;
}

function buildImageUrl(recordId, ext) {
  return `/uploads/players/player-${recordId}${ext}`;
}

function deletePlayerImageFiles(recordId) {
  const dir = getPlayersUploadDir();
  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = path.join(dir, `player-${recordId}${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

function deleteImageByUrl(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/players/')) return;
  const filePath = path.join(__dirname, '..', imageUrl.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  ALLOWED_EXTENSIONS,
  getPlayersUploadDir,
  resolveExtension,
  buildImageUrl,
  deletePlayerImageFiles,
  deleteImageByUrl,
};
