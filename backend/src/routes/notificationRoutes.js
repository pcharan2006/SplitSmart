const router = require('express').Router();
const { param, query } = require('express-validator');
const notificationModel = require('../models/notificationModel');
const ApiError = require('../utils/ApiError');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

router.use(protect);

// GET /api/notifications?unread=true&page=1&limit=20
router.get(
  '/',
  query('unread').optional().isBoolean().withMessage('unread must be true or false'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res) => {
    const notifications = await notificationModel.list(req.user.id, {
      unreadOnly: req.query.unread === 'true',
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ notifications, unread_count: await notificationModel.unreadCount(req.user.id) });
  }
);

// Declared before '/:id/read' so "read-all" isn't treated as an id.
router.post('/read-all', async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  res.json({ unread_count: 0 });
});

router.post('/:id/read', param('id').isInt({ min: 1 }).withMessage('Invalid notification id'), validate, async (req, res) => {
  if (!(await notificationModel.markRead(Number(req.params.id), req.user.id))) throw new ApiError(404, 'Notification not found');
  res.json({ unread_count: await notificationModel.unreadCount(req.user.id) });
});

module.exports = router;
