const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

router.use(protect);

// AI calls cost money: 15 per minute per user (limiter runs after login so it can key on the user).
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 15,
    keyGenerator: (req) => `user:${req.user.id}`,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { message: 'Too many AI requests. Please wait a minute.' },
  })
);

const groupId = body('group_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Invalid group_id').toInt();

router.post(
  '/chat',
  body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('history').optional().isArray({ max: 20 }).withMessage('history must be an array (max 20)'),
  // Clients may only send user/assistant turns. A "system" turn would let them rewrite the rules.
  body('history.*.role').isIn(['user', 'assistant']).withMessage('history roles must be "user" or "assistant"'),
  body('history.*.content').isString().isLength({ min: 1, max: 2000 }).withMessage('history content must be 1-2000 characters'),
  groupId,
  validate,
  ctrl.chat
);

router.post('/insights', groupId, validate, ctrl.insights);

module.exports = router;
