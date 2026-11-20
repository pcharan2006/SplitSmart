const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { imageUpload, verifyImageContent } = require('../middleware/uploadMiddleware');

router.use(protect);
router.get('/me', ctrl.getMe);
router.put(
  '/me',
  imageUpload.single('profile_image'),
  verifyImageContent,
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  validate,
  ctrl.updateMe
);

module.exports = router;
