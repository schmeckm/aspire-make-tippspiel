const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { sendError } = require('../utils/apiResponse');
const { getActivityFeed } = require('../services/activityFeedService');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const scopeRaw = typeof req.query.scope === 'string' ? req.query.scope.toLowerCase() : 'team';
    const scope = scopeRaw === 'global' ? 'global' : 'team';
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 20;
    const feed = await getActivityFeed({ viewerUser: req.user, scope, limit });
    return res.json(feed);
  } catch (error) {
    console.error('Activity feed error:', error);
    return sendError(res, req, 500, 'errors.internalServer');
  }
});

module.exports = router;

