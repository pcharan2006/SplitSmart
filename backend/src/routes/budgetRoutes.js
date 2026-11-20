const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { CATEGORIES } = require('../utils/financialCalculations');

const amount = body('amount').isInt({ min: 1, max: 100000000000 }).withMessage('Amount must be a whole number of paise (min 1)').toInt();
const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid budget id');

router.use(protect);

router.post(
  '/',
  amount,
  body('category').optional().isIn(['ALL', ...CATEGORIES]).withMessage(`Category must be ALL or one of: ${CATEGORIES.join(', ')}`),
  body('group_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Invalid group_id').toInt(),
  body('month').isInt({ min: 1, max: 12 }).withMessage('month must be 1-12').toInt(),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('year must be 2000-2100').toInt(),
  validate,
  ctrl.create
);
router.get(
  '/',
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('year must be 2000-2100'),
  validate,
  ctrl.list
);
router.put('/:id', idParam, amount, validate, ctrl.update);
router.delete('/:id', idParam, validate, ctrl.remove);

module.exports = router;
