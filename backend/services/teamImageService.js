const fs = require('fs');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function getTeamsUploadDir() {
  const dir = path.join(__dirname, '..', 'uploads', 'teams');
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

function buildImageUrl(teamId, ext) {
  return `/uploads/teams/team-${teamId}${ext}`;
}

function deleteTeamImageFiles(teamId) {
  const dir = getTeamsUploadDir();
  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = path.join(dir, `team-${teamId}${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

function deleteImageByUrl(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/teams/')) return;
  const filePath = path.join(__dirname, '..', imageUrl.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  ALLOWED_EXTENSIONS,
  getTeamsUploadDir,
  resolveExtension,
  buildImageUrl,
  deleteTeamImageFiles,
  deleteImageByUrl,
};
