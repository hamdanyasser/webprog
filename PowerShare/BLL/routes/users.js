const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticate, authorize('admin'), userController.getAllUsers);
router.get('/all', authenticate, authorize('admin'), userController.getAllUsers);

router.get('/:userId', authenticate, userController.getUserById);

router.put('/profile', authenticate, upload.single('profile_image'), userController.updateProfile);

router.put('/preferences', authenticate, userController.updatePreferences);

router.get('/settings/notifications', authenticate, userController.getNotificationPreferences);

router.put('/settings/notifications', authenticate, userController.updateNotificationPreferences);

module.exports = router;