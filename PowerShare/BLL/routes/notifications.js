const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Basic notification routes
router.get('/', authenticate, notificationController.getMyNotifications);
router.get('/unread', authenticate, notificationController.getUnreadNotifications);
router.get('/count', authenticate, notificationController.getUnreadCount);

// Advanced notification routes
router.get('/advanced', authenticate, notificationController.getNotificationsAdvanced);
router.get('/statistics', authenticate, notificationController.getStatistics);
router.get('/grouped', authenticate, notificationController.getGrouped);
router.get('/export', authenticate, notificationController.exportToCSV);

// Individual notification actions
router.put('/:notificationId/read', authenticate, notificationController.markAsRead);
router.delete('/:notificationId', authenticate, notificationController.deleteNotification);

// Bulk actions
router.put('/bulk/mark-read', authenticate, notificationController.bulkMarkAsRead);
router.delete('/bulk/delete', authenticate, notificationController.bulkDelete);

// Legacy routes
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.delete('/all', authenticate, notificationController.deleteAllNotifications);

module.exports = router;