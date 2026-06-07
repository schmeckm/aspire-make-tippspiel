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

function withImageCacheBuster(imageUrl, updatedAt) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  const version = updatedAt ? new Date(updatedAt).getTime() : 0;
  if (!version) return imageUrl;
  const base = imageUrl.split('?')[0];
  return `${base}?v=${version}`;
}

function deleteUserImageFiles(userId) {
  const dir = getUsersUploadDir();
  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = path.join(dir, `user-${userId}${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function normalizeGooglePictureUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('sz', '256');
    return parsed.toString();
  } catch {
    return url;
  }
}

async function importProfileImageFromUrl(userId, imageUrl) {
  const sourceUrl = normalizeGooglePictureUrl(imageUrl);
  if (!sourceUrl) return null;

  const response = await fetch(sourceUrl);
  if (!response.ok) return null;

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
  const ext = MIME_TO_EXT[contentType] || '.jpg';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) return null;

  deleteUserImageFiles(userId);
  const filePath = path.join(getUsersUploadDir(), `user-${userId}${ext}`);
  fs.writeFileSync(filePath, buffer);
  return buildImageUrl(userId, ext);
}

module.exports = {
  ALLOWED_EXTENSIONS,
  getUsersUploadDir,
  resolveExtension,
  buildImageUrl,
  withImageCacheBuster,
  deleteUserImageFiles,
  importProfileImageFromUrl,
};
