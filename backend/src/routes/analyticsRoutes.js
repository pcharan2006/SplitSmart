const router = require('express').Router();
const { param, query } = require('express-validator');
const ctrl = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { requireGroupMember } = require('../middleware/groupMiddleware');

router.use(protect);

router.get('/dashboard', ctrl.dashboard);
router.get('/groups/:id', param('id').isInt({ min: 1 }).withMessage('Invalid group id'), validate, requireGroupMember(), ctrl.group);
router.get(
  '/monthly',
  query('months').optional().isInt({ min: 1, max: 24 }).withMessage('months must be 1-24'),
  query('group_id').optional().isInt({ min: 1 }).withMessage('Invalid group_id'),
  validate,
  ctrl.monthly
);

module.exports = router;
