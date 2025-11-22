const express = require('express');
const router = express.Router();
const notificationPreferencesController = require('../controllers/notificationPreferencesController');
const { authenticate } = require('../middleware/auth');

// Get user's notification preferences
router.get('/preferences', authenticate, notificationPreferencesController.getPreferences);

// Update notification preferences
router.put('/preferences', authenticate, notificationPreferencesController.updatePreferences);

// Push notification subscription management
router.post('/push/subscribe', authenticate, notificationPreferencesController.subscribePush);
router.post('/push/unsubscribe', authenticate, notificationPreferencesController.unsubscribePush);
router.get('/push/subscriptions', authenticate, notificationPreferencesController.getPushSubscriptions);

// Test notification
router.post('/test', authenticate, notificationPreferencesController.testNotification);

module.exports = router;
