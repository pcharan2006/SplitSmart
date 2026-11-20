const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/expenseController');
const expenseModel = require('../models/expenseModel');
const ApiError = require('../utils/ApiError');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { requireGroupMember, requireActiveGroup } = require('../middleware/groupMiddleware');
const { CATEGORIES, SPLIT_TYPES } = require('../utils/financialCalculations');

// Shared body rules (used for both create and update). Amounts are integer PAISE.
const expenseBody = [
  body('title').trim().isLength({ min: 1, max: 150 }).withMessage('Title is required (max 150 characters)'),
  body('description').optional({ values: 'null' }).trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
  body('amount').isInt({ min: 1, max: 100000000000 }).withMessage('Amount must be a whole number of paise (min 1)').toInt(),
  body('category').isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('expense_date').isISO8601({ strict: true, strictSeparator: true }).withMessage('expense_date must be YYYY-MM-DD').customSanitizer((v) => String(v).slice(0, 10)),
  body('paid_by').isInt({ min: 1 }).withMessage('paid_by is required').toInt(),
  body('split_type').isIn(SPLIT_TYPES).withMessage(`split_type must be one of: ${SPLIT_TYPES.join(', ')}`),
  body('participants').isArray({ min: 1, max: 100 }).withMessage('At least one participant is required'),
  body('participants.*.user_id').isInt({ min: 1 }).withMessage('Each participant needs a user_id').toInt(),
  body('participants.*.value').optional({ values: 'null' }).isNumeric().withMessage('Participant value must be a number').toFloat(),
];

// Finds the expense, then verifies the user belongs to the expense's group.
async function loadExpense(req, res, next) {
  const expense = await expenseModel.findRaw(Number(req.params.id));
  if (!expense) throw new ApiError(404, 'Expense not found');
  req.expense = expense;
  req.params.groupId = String(expense.group_id);
  next();
}

// For POST: the group id comes from the body.
function groupFromBody(req, res, next) {
  req.params.groupId = String(req.body.group_id);
  next();
}

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid expense id');

router.use(protect);

router.post(
  '/',
  body('group_id').isInt({ min: 1 }).withMessage('group_id is required'),
  ...expenseBody,
  validate,
  groupFromBody,
  requireGroupMember('groupId'),
  requireActiveGroup,
  ctrl.create
);
router.get('/:id', idParam, validate, loadExpense, requireGroupMember('groupId'), ctrl.get);
router.put('/:id', idParam, ...expenseBody, validate, loadExpense, requireGroupMember('groupId'), requireActiveGroup, ctrl.update);
router.delete('/:id', idParam, validate, loadExpense, requireGroupMember('groupId'), requireActiveGroup, ctrl.remove);

module.exports = router;
