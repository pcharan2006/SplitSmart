const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const { validate } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

// Brute-force protection on sensitive endpoints (off in tests). Per IP, per 15 minutes:
// 20 in production (override with AUTH_RATE_LIMIT), 200 in development so normal testing never locks you out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => Number(process.env.AUTH_RATE_LIMIT) || (process.env.NODE_ENV === 'production' ? 20 : 200),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts, please try again later' },
});

const email = body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false });
const password = (field = 'password') =>
  body(field)
    .isString().withMessage('Password is required')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

router.post(
  '/register',
  authLimiter,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  email,
  password(),
  body('confirmPassword')
    .custom((v, { req }) => v === req.body.password)
    .withMessage('Passwords do not match'),
  validate,
  ctrl.register
);

router.post(
  '/login',
  authLimiter,
  email,
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
  ctrl.login
);

router.get('/me', protect, ctrl.me);

router.post(
  '/change-password',
  protect,
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  password('newPassword'),
  validate,
  ctrl.changePassword
);

router.post('/forgot-password', authLimiter, email, validate, ctrl.forgotPassword);

router.post(
  '/reset-password',
  authLimiter,
  body('token').isString().notEmpty().withMessage('Token is required'),
  password('newPassword'),
  validate,
  ctrl.resetPassword
);

module.exports = router;
