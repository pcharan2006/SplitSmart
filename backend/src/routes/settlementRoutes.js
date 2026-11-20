const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/settlementController');
const settlementModel = require('../models/settlementModel');
const ApiError = require('../utils/ApiError');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { requireGroupMember, requireActiveGroup } = require('../middleware/groupMiddleware');

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid settlement id');

// Finds the settlement, then verifies the user belongs to its group.
async function loadSettlement(req, res, next) {
  const s = await settlementModel.findById(Number(req.params.id));
  if (!s) throw new ApiError(404, 'Settlement not found');
  req.settlement = s;
  req.params.groupId = String(s.group_id);
  next();
}

function groupFromBody(req, res, next) {
  req.params.groupId = String(req.body.group_id);
  next();
}

router.use(protect);

router.post(
  '/',
  body('group_id').isInt({ min: 1 }).withMessage('group_id is required'),
  body('paid_by').isInt({ min: 1 }).withMessage('paid_by is required').toInt(),
  body('paid_to').isInt({ min: 1 }).withMessage('paid_to is required').toInt(),
  body('amount').isInt({ min: 1, max: 100000000000 }).withMessage('Amount must be a whole number of paise (min 1)').toInt(),
  body('payment_date').optional().isISO8601({ strict: true, strictSeparator: true }).withMessage('payment_date must be YYYY-MM-DD')
    .customSanitizer((v) => String(v).slice(0, 10)),
  validate,
  groupFromBody,
  requireGroupMember('groupId'),
  requireActiveGroup,
  ctrl.create
);

for (const action of ['confirm', 'reject']) {
  router.post(`/:id/${action}`, idParam, validate, loadSettlement, requireGroupMember('groupId'), requireActiveGroup, ctrl[action]);
}
router.delete('/:id', idParam, validate, loadSettlement, requireGroupMember('groupId'), requireActiveGroup, ctrl.cancel);

module.exports = router;
