const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Team } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { sendError, translate } = require('../utils/apiResponse');
const { normalizeLocale } = require('../services/i18nService');
const { getSetting } = require('../services/settingsService');
const { generateToken, expiresInHours } = require('../services/authTokenService');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/authEmailService');
const emailService = require('../services/emailService');
const { blacklistToken } = require('../services/tokenBlacklistService');

const router = express.Router();

async function isRegistrationOpen() {
  return getSetting('registrationEnabled', true);
}

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

router.post('/register', async (req, res) => {
  try {
    const open = await isRegistrationOpen();
    if (!open) {
      return sendError(res, req, 403, 'errors.registrationDisabled');
    }

    const { firstName, lastName, email, password, passwordConfirm, teamId, language } = req.body;

    if (!firstName || !lastName || !email || !password || !passwordConfirm) {
      return sendError(res, req, 400, 'errors.registrationFieldsRequired');
    }

    if (password !== passwordConfirm) {
      return sendError(res, req, 400, 'errors.passwordsDoNotMatch');
    }

    if (password.length < 6) {
      return sendError(res, req, 400, 'errors.passwordMinLength');
    }

    const requireTeam = await getSetting('requireTeamOnRegistration', true);
    if (requireTeam && !teamId) {
      return sendError(res, req, 400, 'errors.teamRequiredOnRegistration');
    }

    const locale = normalizeLocale(language || req.locale);

    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return sendError(res, req, 409, 'errors.emailRegistered');
    }

    if (teamId) {
      const team = await Team.findByPk(teamId);
      if (!team) {
        return sendError(res, req, 400, 'errors.teamNotExists');
      }
    }

    const requireVerification = await getSetting('requireEmailVerification', true);
    const verificationToken = requireVerification ? generateToken() : null;

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      teamId: teamId || null,
      role: 'user',
      language: locale,
      emailVerified: !requireVerification,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationToken ? expiresInHours(24) : null,
    });

    let emailSent = false;
    if (requireVerification && verificationToken) {
      const result = await sendVerificationEmail(user, verificationToken);
      emailSent = !result.mock;
      if (result.mock) {
        console.log(`[Email mock] Verifizierung für ${user.email}: ${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`);
      }
    }

    if (requireVerification) {
      return res.status(201).json({
        message: translate(req, 'messages.registrationVerifyEmail'),
        requiresVerification: true,
        emailSent,
        email: user.email,
      });
    }

    const userWithTeam = await User.findByPk(user.id, {
      include: [{ model: Team, as: 'team' }],
    });
    const token = issueToken(user);

    res.status(201).json({
      message: translate(req, 'messages.registrationSuccess'),
      requiresVerification: false,
      token,
      user: userWithTeam.toSafeJSON(),
    });
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, req, 500, 'errors.registrationFailed');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, language } = req.body;

    if (!email || !password) {
      return sendError(res, req, 400, 'errors.loginFieldsRequired');
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ model: Team, as: 'team' }],
    });

    if (!user) {
      return sendError(res, req, 401, 'errors.invalidCredentials');
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return sendError(res, req, 401, 'errors.invalidCredentials');
    }

    const requireVerification = await getSetting('requireEmailVerification', true);
    if (requireVerification && !user.emailVerified && user.role !== 'admin') {
      return sendError(res, req, 403, 'errors.emailNotVerified');
    }

    if (language) {
      const locale = normalizeLocale(language);
      if (normalizeLocale(user.language) !== locale) {
        await user.update({ language: locale });
      }
    }

    const token = issueToken(user);

    res.json({
      message: translate(req, 'messages.loginSuccess'),
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, req, 500, 'errors.loginFailed');
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return sendError(res, req, 400, 'errors.invalidVerificationToken');
    }

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() },
      },
      include: [{ model: Team, as: 'team' }],
    });

    if (!user) {
      return sendError(res, req, 400, 'errors.invalidVerificationToken');
    }

    await user.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    const jwtToken = issueToken(user);

    res.json({
      message: translate(req, 'messages.emailVerified'),
      token: jwtToken,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('Verify email error:', error);
    sendError(res, req, 500, 'errors.verificationFailed');
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email) {
      return sendError(res, req, 400, 'errors.loginFieldsRequired');
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.emailVerified) {
      return res.json({ message: translate(req, 'messages.verificationEmailSent') });
    }

    const locale = normalizeLocale(language || req.locale);
    const token = generateToken();
    const updates = {
      emailVerificationToken: token,
      emailVerificationExpires: expiresInHours(24),
    };
    if (normalizeLocale(user.language) !== locale) {
      updates.language = locale;
    }
    await user.update(updates);

    const result = await sendVerificationEmail(user, token, locale);
    if (result.mock) {
      console.log(`[Email mock] Verifizierung erneut: ${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${token}`);
    }

    res.json({
      message: translate(req, 'messages.verificationEmailSent'),
      emailSent: !result.mock,
    });
  } catch (error) {
    sendError(res, req, 500, 'errors.verificationFailed');
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email) {
      return sendError(res, req, 400, 'errors.loginFieldsRequired');
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (user) {
      const locale = normalizeLocale(language || req.locale);
      const token = generateToken();
      const updates = {
        passwordResetToken: token,
        passwordResetExpires: expiresInHours(1),
      };
      if (normalizeLocale(user.language) !== locale) {
        updates.language = locale;
      }
      await user.update(updates);
      const result = await sendPasswordResetEmail(user, token, locale);
      if (result.mock) {
        console.log(`[Email mock] Passwort-Reset: ${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`);
      }
    }

    res.json({ message: translate(req, 'messages.passwordResetSent') });
  } catch (error) {
    sendError(res, req, 500, 'errors.passwordResetFailed');
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return sendError(res, req, 400, 'errors.passwordResetFieldsRequired');
    }
    if (password.length < 6) {
      return sendError(res, req, 400, 'errors.passwordMinLength');
    }

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return sendError(res, req, 400, 'errors.invalidResetToken');
    }

    await user.update({
      password,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    res.json({ message: translate(req, 'messages.passwordResetSuccess') });
  } catch (error) {
    sendError(res, req, 500, 'errors.passwordResetFailed');
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const decoded = jwt.decode(token);
      const expMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
      blacklistToken(token, expMs);
    }
    res.json({ message: translate(req, 'messages.logoutSuccess') });
  } catch (error) {
    sendError(res, req, 500, 'errors.logoutFailed');
  }
});

module.exports = router;
