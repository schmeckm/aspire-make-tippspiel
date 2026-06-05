const fs = require('fs');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function getUsersUploadDir() {
  const dir = path.join(__dirname, '..', 'uploads', 'users');
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

function buildImageUrl(userId, ext) {
  return `/uploads/users/user-${userId}${ext}`;
}

function deleteUserImageFiles(userId) {
  const dir = getUsersUploadDir();
  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = path.join(dir, `user-${userId}${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

module.exports = {
  ALLOWED_EXTENSIONS,
  getUsersUploadDir,
  resolveExtension,
  buildImageUrl,
  deleteUserImageFiles,
};
