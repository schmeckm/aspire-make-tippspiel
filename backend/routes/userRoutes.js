const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { User, Team } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { sendError, translate } = require('../utils/apiResponse');
const { normalizeLocale, SUPPORTED_LOCALES } = require('../services/i18nService');
const {
  ALLOWED_EXTENSIONS,
  getUsersUploadDir,
  resolveExtension,
  buildImageUrl,
  deleteUserImageFiles,
} = require('../services/userImageService');
const { validateImageFile } = require('../utils/fileValidation');
const { deleteUserAccount } = require('../services/userAccountService');
const { normalizeAvatarColor } = require('../services/avatarColorService');

const router = express.Router();

function canManageUser(req, userId) {
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id === parseInt(userId, 10);
  return isAdmin || isSelf;
}

const userImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, getUsersUploadDir()),
    filename: (req, file, cb) => {
      const ext = resolveExtension(file);
      if (!ext) return cb(new Error('INVALID_IMAGE'));
      cb(null, `user-${req.params.id}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('INVALID_IMAGE'));
  },
});

router.use(authMiddleware);

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Team, as: 'team' }],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    res.json(users.map((u) => u.toSafeJSON()));
  } catch (error) {
    sendError(res, req, 500, 'errors.usersLoadFailed');
  }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, teamId, language } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return sendError(res, req, 400, 'errors.requiredFields');
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return sendError(res, req, 409, 'errors.emailTaken');
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'user',
      teamId: teamId || null,
      language: normalizeLocale(language || req.locale),
      emailVerified: true,
    });

    const userWithTeam = await User.findByPk(user.id, {
      include: [{ model: Team, as: 'team' }],
    });

    res.status(201).json(userWithTeam.toSafeJSON());
  } catch (error) {
    sendError(res, req, 500, 'errors.userCreateFailed');
  }
});

router.post(
  '/:id/image',
  (req, res, next) => {
    if (!canManageUser(req, req.params.id)) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }
    next();
  },
  (req, res, next) => {
    userImageUpload.single('image')(req, res, (err) => {
      if (err) {
        return sendError(res, req, 400, 'errors.userImageInvalid');
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        include: [{ model: Team, as: 'team' }],
      });
      if (!user) {
        if (req.file) fs.unlinkSync(req.file.path);
        return sendError(res, req, 404, 'errors.userNotFound');
      }

      if (!req.file) {
        return sendError(res, req, 400, 'errors.userImageRequired');
      }

      const validation = validateImageFile(req.file);
      if (!validation.ok) {
        fs.unlinkSync(req.file.path);
        return sendError(res, req, 400, 'errors.userImageInvalid');
      }

      const ext = path.extname(req.file.filename).toLowerCase();
      const dir = getUsersUploadDir();
      for (const allowedExt of ALLOWED_EXTENSIONS) {
        if (allowedExt === ext) continue;
        const oldPath = path.join(dir, `user-${user.id}${allowedExt}`);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      user.imageUrl = buildImageUrl(user.id, ext);
      await user.save();
      res.json(user.toSafeJSON());
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      sendError(res, req, 500, 'errors.userImageUploadFailed');
    }
  },
);

router.delete('/:id/image', async (req, res) => {
  try {
    if (!canManageUser(req, req.params.id)) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }

    const user = await User.findByPk(req.params.id, {
      include: [{ model: Team, as: 'team' }],
    });
    if (!user) {
      return sendError(res, req, 404, 'errors.userNotFound');
    }

    deleteUserImageFiles(user.id);
    user.imageUrl = null;
    await user.save();
    res.json(user.toSafeJSON());
  } catch (error) {
    sendError(res, req, 500, 'errors.userImageDeleteFailed');
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!canManageUser(req, req.params.id)) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }

    const user = await User.findByPk(req.params.id, {
      include: [{ model: Team, as: 'team' }],
    });

    if (!user) {
      return sendError(res, req, 404, 'errors.userNotFound');
    }

    res.json(user.toSafeJSON());
  } catch (error) {
    sendError(res, req, 500, 'errors.userLoadFailed');
  }
});

function parseOptionalInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

router.put('/:id', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === parseInt(req.params.id, 10);

    if (!isAdmin && !isSelf) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return sendError(res, req, 404, 'errors.userNotFound');
    }

    const {
      firstName, lastName, email, password, role, teamId, language,
      favoriteNationalTeamId, favoriteNationalTeamName,
      topScorerPlayerId, topScorerPlayerName, avatarColor,
    } = req.body;

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (email && isAdmin) user.email = email.toLowerCase().trim();
    if (password) user.password = password;
    if (isAdmin && role) user.role = role;
    if (isAdmin && req.body.emailVerified !== undefined) {
      user.emailVerified = !!req.body.emailVerified;
      if (user.emailVerified) {
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
      }
    }
    if (teamId !== undefined) user.teamId = parseOptionalInt(teamId);
    if (language !== undefined) {
      const code = String(language).toLowerCase().split('-')[0];
      if (!SUPPORTED_LOCALES.includes(code)) {
        return sendError(res, req, 400, 'errors.invalidLanguage');
      }
      user.language = code;
    }
    if (favoriteNationalTeamId !== undefined) {
      user.favoriteNationalTeamId = parseOptionalInt(favoriteNationalTeamId);
    }
    if (favoriteNationalTeamName !== undefined) {
      user.favoriteNationalTeamName = favoriteNationalTeamName?.trim() || null;
    }
    if (topScorerPlayerId !== undefined) {
      user.topScorerPlayerId = parseOptionalInt(topScorerPlayerId);
    }
    if (topScorerPlayerName !== undefined) {
      user.topScorerPlayerName = topScorerPlayerName?.trim() || null;
    }
    if (avatarColor !== undefined) {
      user.avatarColor = normalizeAvatarColor(avatarColor);
    }

    await user.save();

    const updated = await User.findByPk(user.id, {
      include: [{ model: Team, as: 'team' }],
    });

    res.json(updated.toSafeJSON());
  } catch (error) {
    sendError(res, req, 500, 'errors.userUpdateFailed');
  }
});

router.delete('/me', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return sendError(res, req, 404, 'errors.userNotFound');
    }

    const { password } = req.body || {};
    if (!password) {
      return sendError(res, req, 400, 'errors.passwordRequired');
    }

    const passwordValid = await user.comparePassword(password);
    if (!passwordValid) {
      return sendError(res, req, 400, 'errors.invalidPassword');
    }

    await deleteUserAccount(user, { req, auditAction: 'USER_SELF_DELETE' });
    res.json({ message: translate(req, 'messages.accountDeleted') });
  } catch (error) {
    if (error.code === 'LAST_ADMIN') {
      return sendError(res, req, 400, 'errors.cannotDeleteLastAdmin');
    }
    sendError(res, req, 500, 'errors.userDeleteFailed');
  }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return sendError(res, req, 404, 'errors.userNotFound');
    }

    if (user.id === req.user.id) {
      return sendError(res, req, 400, 'errors.cannotDeleteSelf');
    }

    await deleteUserAccount(user, { req, auditAction: 'USER_DELETE' });
    res.json({ message: translate(req, 'messages.userDeleted') });
  } catch (error) {
    if (error.code === 'LAST_ADMIN') {
      return sendError(res, req, 400, 'errors.cannotDeleteLastAdmin');
    }
    sendError(res, req, 500, 'errors.userDeleteFailed');
  }
});

module.exports = router;
