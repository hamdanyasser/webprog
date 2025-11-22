/**
 * Notification Preferences Controller
 * Handles notification preferences and push subscription management
 */

const notificationPreferencesDAL = require('../../DAL/notificationPreferencesDAL');

class NotificationPreferencesController {
    /**
     * Get user's notification preferences
     */
    async getPreferences(req, res) {
        try {
            const userId = req.user.userId;

            const preferences = await notificationPreferencesDAL.getUserPreferences(userId);

            res.json({
                success: true,
                data: preferences
            });
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification preferences'
            });
        }
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(req, res) {
        try {
            const userId = req.user.userId;
            const preferences = req.body;

            const updated = await notificationPreferencesDAL.updatePreferences(userId, preferences);

            res.json({
                success: true,
                message: 'Notification preferences updated successfully',
                data: updated
            });
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update notification preferences'
            });
        }
    }

    /**
     * Subscribe to push notifications
     */
    async subscribePush(req, res) {
        try {
            const userId = req.user.userId;
            const { subscription } = req.body;

            if (!subscription || !subscription.endpoint) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid push subscription data'
                });
            }

            const db = require('../../DAL/dbConnection');

            // Extract keys from subscription
            const endpoint = subscription.endpoint;
            const p256dhKey = subscription.keys.p256dh;
            const authKey = subscription.keys.auth;

            // Get user agent info
            const userAgent = req.headers['user-agent'] || '';

            // Check if subscription already exists
            const [existing] = await db.execute(
                `SELECT subscription_id FROM push_subscriptions
                 WHERE user_id = ? AND endpoint = ?`,
                [userId, endpoint]
            );

            if (existing.length > 0) {
                // Update existing subscription
                await db.execute(
                    `UPDATE push_subscriptions
                     SET p256dh_key = ?, auth_key = ?, is_active = TRUE,
                         user_agent = ?, last_used_at = NOW()
                     WHERE subscription_id = ?`,
                    [p256dhKey, authKey, userAgent, existing[0].subscription_id]
                );

                return res.json({
                    success: true,
                    message: 'Push subscription updated successfully'
                });
            }

            // Create new subscription
            await db.execute(
                `INSERT INTO push_subscriptions
                 (user_id, endpoint, p256dh_key, auth_key, user_agent)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, endpoint, p256dhKey, authKey, userAgent]
            );

            res.json({
                success: true,
                message: 'Push subscription created successfully'
            });
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to subscribe to push notifications'
            });
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribePush(req, res) {
        try {
            const userId = req.user.userId;
            const { endpoint } = req.body;

            const db = require('../../DAL/dbConnection');

            if (endpoint) {
                // Unsubscribe specific endpoint
                await db.execute(
                    `UPDATE push_subscriptions
                     SET is_active = FALSE
                     WHERE user_id = ? AND endpoint = ?`,
                    [userId, endpoint]
                );
            } else {
                // Unsubscribe all
                await db.execute(
                    `UPDATE push_subscriptions
                     SET is_active = FALSE
                     WHERE user_id = ?`,
                    [userId]
                );
            }

            res.json({
                success: true,
                message: 'Push subscription removed successfully'
            });
        } catch (error) {
            console.error('Error unsubscribing from push notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to unsubscribe from push notifications'
            });
        }
    }

    /**
     * Get push subscriptions for user
     */
    async getPushSubscriptions(req, res) {
        try {
            const userId = req.user.userId;
            const db = require('../../DAL/dbConnection');

            const [subscriptions] = await db.execute(
                `SELECT subscription_id, device_name, browser,
                        is_active, last_used_at, created_at
                 FROM push_subscriptions
                 WHERE user_id = ?
                 ORDER BY last_used_at DESC`,
                [userId]
            );

            res.json({
                success: true,
                data: subscriptions
            });
        } catch (error) {
            console.error('Error getting push subscriptions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get push subscriptions'
            });
        }
    }

    /**
     * Test notification (for testing purposes)
     */
    async testNotification(req, res) {
        try {
            const userId = req.user.userId;
            const socketService = require('../services/socketService');
            const notificationDAL = require('../../DAL/notificationDAL');

            // Create test notification
            const notification = await notificationDAL.createNotification({
                user_id: userId,
                title: 'Test Notification',
                message: 'This is a test notification to verify your notification settings are working correctly.',
                type: 'system',
                icon: '🔔'
            });

            // Send via real-time
            await socketService.sendToUser(userId, notification);

            res.json({
                success: true,
                message: 'Test notification sent successfully',
                data: notification
            });
        } catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send test notification'
            });
        }
    }
}

module.exports = new NotificationPreferencesController();
