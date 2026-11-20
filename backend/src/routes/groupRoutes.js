const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { requireGroupMember, requireGroupAdmin, requireActiveGroup } = require('../middleware/groupMiddleware');

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid group id');
const name = (optional) => {
  const c = optional ? body('name').optional() : body('name');
  return c.trim().isLength({ min: 2, max: 100 }).withMessage('Group name must be 2-100 characters');
};
const description = body('description').optional({ values: 'null' }).trim().isLength({ max: 500 }).withMessage('Description max 500 characters');

router.use(protect); // every group route needs login

router.post('/', name(false), description, validate, ctrl.create);
router.get('/', ctrl.list);
// Must be declared before '/:id' routes so "join" isn't read as an id.
router.post('/join', body('code').isString().trim().isLength({ min: 6, max: 32 }).withMessage('Invitation code required'), validate, ctrl.join);

router.get('/:id', idParam, validate, requireGroupMember(), ctrl.get);
router.put('/:id', idParam, name(true), description, validate, requireGroupMember(), requireGroupAdmin, requireActiveGroup, ctrl.update);
router.delete('/:id', idParam, validate, requireGroupMember(), requireGroupAdmin, ctrl.remove);
router.post('/:id/archive', idParam, validate, requireGroupMember(), requireGroupAdmin, ctrl.archive);
router.post('/:id/unarchive', idParam, validate, requireGroupMember(), requireGroupAdmin, ctrl.unarchive);

router.post(
  '/:id/members',
  idParam,
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
  validate,
  requireGroupMember(), requireGroupAdmin, requireActiveGroup,
  ctrl.addMember
);
router.delete(
  '/:id/members/:userId',
  idParam,
  param('userId').isInt({ min: 1 }).withMessage('Invalid user id'),
  validate,
  requireGroupMember(), requireActiveGroup,
  ctrl.removeMember
);
router.post('/:id/invitations', idParam, validate, requireGroupMember(), requireGroupAdmin, requireActiveGroup, ctrl.createInvite);

// Expense history for one group, with search / category / date filters and pagination.
const { query } = require('express-validator');
const expenseCtrl = require('../controllers/expenseController');
const { CATEGORIES } = require('../utils/financialCalculations');
router.get(
  '/:id/expenses',
  idParam,
  query('search').optional().trim().isLength({ max: 100 }),
  query('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  query('from').optional().isISO8601({ strict: true }).withMessage('from must be YYYY-MM-DD'),
  query('to').optional().isISO8601({ strict: true }).withMessage('to must be YYYY-MM-DD'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  requireGroupMember(),
  expenseCtrl.listByGroup
);

// Balances and suggested payments (read-only).
const settlementCtrl = require('../controllers/settlementController');
router.get('/:id/balances', idParam, validate, requireGroupMember(), settlementCtrl.getBalances);
router.get('/:id/settlements/suggestions', idParam, validate, requireGroupMember(), settlementCtrl.getSuggestions);

router.get(
  '/:id/settlements',
  idParam,
  query('status').optional().isIn(['pending', 'completed', 'rejected']).withMessage('Invalid status'),
  validate,
  requireGroupMember(),
  settlementCtrl.list
);

module.exports = router;
