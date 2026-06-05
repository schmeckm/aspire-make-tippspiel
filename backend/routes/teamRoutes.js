const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { sendError, translate } = require('../utils/apiResponse');
const { Team, User } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getTeamsUploadDir,
  resolveExtension,
  buildImageUrl,
  deleteTeamImageFiles,
  ALLOWED_EXTENSIONS,
} = require('../services/teamImageService');

const router = express.Router();

const teamImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, getTeamsUploadDir()),
    filename: (req, file, cb) => {
      const ext = resolveExtension(file);
      if (!ext) return cb(new Error('INVALID_IMAGE'));
      cb(null, `team-${req.params.id}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('INVALID_IMAGE'));
  },
});

router.get('/', async (req, res) => {
  try {
    const teams = await Team.findAll({
      include: [{ model: User, as: 'users', attributes: ['id'] }],
      order: [['name', 'ASC']],
    });
    res.json(teams);
  } catch (error) {
    sendError(res, req, 500, 'errors.teamsLoadFailed');
  }
});

router.post('/seed-defaults', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { ensureProductionTeams } = require('../database/teamsSeed');
    const result = await ensureProductionTeams(Team);
    const teams = await Team.findAll({
      include: [{ model: User, as: 'users', attributes: ['id'] }],
      order: [['name', 'ASC']],
    });
    res.json({
      message: translate(req, 'messages.teamsSeeded'),
      created: result.created,
      existing: result.existing,
      teams,
    });
  } catch (error) {
    sendError(res, req, 500, 'errors.teamsSeedFailed');
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return sendError(res, req, 400, 'errors.teamNameRequired');
    }

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || null,
    });

    res.status(201).json(team);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, req, 409, 'errors.teamNameTaken');
    }
    sendError(res, req, 500, 'errors.teamCreateFailed');
  }
});

router.post(
  '/:id/image',
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    teamImageUpload.single('image')(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_IMAGE' || err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, req, 400, 'errors.teamImageInvalid');
        }
        return sendError(res, req, 400, 'errors.teamImageInvalid');
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const team = await Team.findByPk(req.params.id);
      if (!team) {
        if (req.file) fs.unlinkSync(req.file.path);
        return sendError(res, req, 404, 'errors.teamNotFound');
      }

      if (!req.file) {
        return sendError(res, req, 400, 'errors.teamImageRequired');
      }

      const ext = path.extname(req.file.filename).toLowerCase();
      const dir = getTeamsUploadDir();
      for (const allowedExt of ALLOWED_EXTENSIONS) {
        if (allowedExt === ext) continue;
        const oldPath = path.join(dir, `team-${team.id}${allowedExt}`);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      team.imageUrl = buildImageUrl(team.id, ext);
      await team.save();
      res.json(team);
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      sendError(res, req, 500, 'errors.teamImageUploadFailed');
    }
  },
);

router.delete('/:id/image', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) {
      return sendError(res, req, 404, 'errors.teamNotFound');
    }

    deleteTeamImageFiles(team.id);
    team.imageUrl = null;
    await team.save();
    res.json(team);
  } catch (error) {
    sendError(res, req, 500, 'errors.teamImageDeleteFailed');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id, {
      include: [{ model: User, as: 'users' }],
    });
    if (!team) {
      return sendError(res, req, 404, 'errors.teamNotFound');
    }
    res.json(team);
  } catch (error) {
    sendError(res, req, 500, 'errors.teamLoadFailed');
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) {
      return sendError(res, req, 404, 'errors.teamNotFound');
    }

    const { name, description } = req.body;
    if (name) team.name = name.trim();
    if (description !== undefined) team.description = description?.trim() || null;

    await team.save();
    res.json(team);
  } catch (error) {
    sendError(res, req, 500, 'errors.teamUpdateFailed');
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) {
      return sendError(res, req, 404, 'errors.teamNotFound');
    }

    deleteTeamImageFiles(team.id);
    await User.update({ teamId: null }, { where: { teamId: team.id } });
    await team.destroy();
    res.json({ message: translate(req, 'messages.teamDeleted') });
  } catch (error) {
    sendError(res, req, 500, 'errors.teamDeleteFailed');
  }
});

module.exports = router;
