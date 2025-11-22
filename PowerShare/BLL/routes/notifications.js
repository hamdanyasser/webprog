const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, notificationController.getMyNotifications);
router.get('/unread', authenticate, notificationController.getUnreadNotifications);
router.get('/count', authenticate, notificationController.getUnreadCount);
router.put('/:notificationId/read', authenticate, notificationController.markAsRead);
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.delete('/all', authenticate, notificationController.deleteAllNotifications);
router.delete('/:notificationId', authenticate, notificationController.deleteNotification);

module.exports = router;