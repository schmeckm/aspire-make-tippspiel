const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { sendError, translate } = require('../utils/apiResponse');
const {
  listImages,
  getImageById,
  searchProviders,
  approveImage,
  createManualImage,
  applyUploadedFile,
  replaceImageMetadata,
  applyProviderResult,
  removeImage,
  deleteImageRecord,
  resolveImage,
} = require('../services/playerImageService');
const {
  isEnabled,
  getSupportedProviders,
  testTheSportsDbConnection,
} = require('../services/playerImageProviderService');
const {
  getPlayersUploadDir,
  resolveExtension,
  ALLOWED_EXTENSIONS,
} = require('../services/manualPlayerImageUploadService');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

const playerImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, getPlayersUploadDir()),
    filename: (req, file, cb) => {
      const ext = resolveExtension(file);
      if (!ext) return cb(new Error('INVALID_IMAGE'));
      cb(null, `player-${req.params.id}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('INVALID_IMAGE'));
  },
});

router.get('/status', async (req, res) => {
  res.json({
    enabled: isEnabled(),
    providers: getSupportedProviders(),
  });
});

router.get('/', async (req, res) => {
  try {
    const { search, limit, offset } = req.query;
    const data = await listImages({
      search: search || '',
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (error) {
    console.error('Player images list error:', error.message);
    sendError(res, req, 500, 'errors.playerImagesLoadFailed');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await getImageById(req.params.id);
    if (!record) return sendError(res, req, 404, 'errors.playerImageNotFound');
    res.json(record);
  } catch (error) {
    sendError(res, req, 500, 'errors.playerImageLoadFailed');
  }
});

router.post('/search', async (req, res) => {
  try {
    const { playerName, teamName, countryCode } = req.body || {};
    if (!playerName?.trim()) {
      return sendError(res, req, 400, 'errors.playerImageNameRequired');
    }

    const results = await searchProviders({ playerName, teamName, countryCode });
    res.json({ results });
  } catch (error) {
    console.error('Player image provider search error:', error.message);
    sendError(res, req, 500, 'errors.playerImageSearchFailed');
  }
});

router.post('/resolve', async (req, res) => {
  try {
    const { playerName, teamName, countryCode, refresh } = req.body || {};
    if (!playerName?.trim()) {
      return sendError(res, req, 400, 'errors.playerImageNameRequired');
    }

    const result = await resolveImage({
      playerName,
      teamName,
      countryCode,
      forceRefresh: !!refresh,
    });
    res.json(result || { imageUrl: null, source: null });
  } catch (error) {
    console.error('Player image resolve error:', error.message);
    sendError(res, req, 500, 'errors.playerImageLookupFailed');
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      playerName, teamName, countryCode, licenseInfo, attributionText,
    } = req.body || {};

    if (!playerName?.trim()) {
      return sendError(res, req, 400, 'errors.playerImageNameRequired');
    }

    const record = await createManualImage({
      playerName,
      teamName,
      countryCode,
      licenseInfo,
      attributionText,
      userId: req.user.id,
      req,
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Player image create error:', error.message);
    sendError(res, req, 500, 'errors.playerImageCreateFailed');
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const record = await approveImage(req.params.id, req.user.id, req);
    if (!record) return sendError(res, req, 404, 'errors.playerImageNotFound');
    res.json(record);
  } catch (error) {
    sendError(res, req, 500, 'errors.playerImageApproveFailed');
  }
});

router.post('/:id/apply', async (req, res) => {
  try {
    const providerResult = req.body || {};
    if (!providerResult.imageUrl) {
      return sendError(res, req, 400, 'errors.playerImageUrlRequired');
    }

    const record = await applyProviderResult(req.params.id, providerResult, req.user.id, req);
    if (!record) return sendError(res, req, 404, 'errors.playerImageNotFound');
    res.json(record);
  } catch (error) {
    sendError(res, req, 500, 'errors.playerImageReplaceFailed');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const record = await replaceImageMetadata(req.params.id, req.body || {}, req.user.id, req);
    if (!record) return sendError(res, req, 404, 'errors.playerImageNotFound');
    res.json(record);
  } catch (error) {
    sendError(res, req, 500, 'errors.playerImageReplaceFailed');
  }
});

router.post(
  '/:id/image',
  (req, res, next) => {
    playerImageUpload.single('image')(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_IMAGE' || err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, req, 400, 'errors.playerImageInvalid');
        }
        return sendError(res, req, 400, 'errors.playerImageInvalid');
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, req, 400, 'errors.playerImageRequired');
      }

      const ext = path.extname(req.file.filename).toLowerCase();
      const dir = getPlayersUploadDir();
      for (const allowedExt of ALLOWED_EXTENSIONS) {
        if (allowedExt === ext) continue;
        const oldPath = path.join(dir, `player-${req.params.id}${allowedExt}`);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const record = await applyUploadedFile(req.params.id, ext);
      if (!record) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return sendError(res, req, 404, 'errors.playerImageNotFound');
      }

      res.json(record);
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      sendError(res, req, 500, 'errors.playerImageUploadFailed');
    }
  },
);

router.delete('/:id/image', async (req, res) => {
  try {
    const record = await removeImage(req.params.id, req.user.id, req);
    if (!record) return sendError(res, req, 404, 'errors.playerImageNotFound');
    res.json(record);
  } catch (error) {
    sendError(res, req, 500, 'errors.playerImageDeleteFailed');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteImageRecord(req.params.id, req.user.id, req);
    if (!deleted) return sendError(res, req, 404, 'errors.playerImageNotFound');
    res.json({ message: translate(req, 'messages.playerImageDeleted') });
  } catch (error) {
    sendError(res, req, 500, 'errors.playerImageDeleteFailed');
  }
});

router.post('/test-thesportsdb', async (req, res) => {
  try {
    const result = await testTheSportsDbConnection();
    res.json(result);
  } catch (error) {
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.playerImageApiNotConfigured');
  }
});

module.exports = router;
