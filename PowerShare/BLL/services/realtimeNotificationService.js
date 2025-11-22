/**
 * Real-Time Notification Service
 * Unified service for sending notifications across all channels
 * (In-App, Email, SMS, Push)
 */

const notificationDAL = require('../../DAL/notificationDAL');
const notificationPreferencesDAL = require('../../DAL/notificationPreferencesDAL');
const socketService = require('./socketService');
const emailService = require('./emailService');

class RealtimeNotificationService {
    /**
     * Send notification to a user across all enabled channels
     * @param {object} options - Notification options
     * @param {number} options.userId - User ID
     * @param {string} options.title - Notification title
     * @param {string} options.message - Notification message
     * @param {string} options.type - Notification type (bill, payment, outage, etc.)
     * @param {string} options.actionUrl - Optional action URL
     * @param {string} options.icon - Optional icon
     * @param {boolean} options.forceEmail - Force email even if user disabled it
     * @param {boolean} options.forceSMS - Force SMS even if user disabled it
     */
    async sendNotification(options) {
        const {
            userId,
            title,
            message,
            type = 'system',
            actionUrl = null,
            icon = null,
            forceEmail = false,
            forceSMS = false
        } = options;

        try {
            // Get user preferences
            const preferences = await notificationPreferencesDAL.getUserPreferences(userId);

            const results = {
                inApp: false,
                email: false,
                sms: false,
                push: false
            };

            // 1. Create in-app notification (if enabled)
            if (preferences.enable_in_app &&
                await notificationPreferencesDAL.shouldNotify(userId, type, 'in_app')) {

                const notification = await notificationDAL.createNotification({
                    user_id: userId,
                    title,
                    message,
                    type,
                    action_url: actionUrl,
                    icon
                });

                // Send via WebSocket
                await socketService.sendToUser(userId, notification);
                results.inApp = true;
            }

            // 2. Send email notification (if enabled or forced)
            if ((forceEmail || preferences.enable_email) &&
                await notificationPreferencesDAL.shouldNotify(userId, type, 'email')) {

                try {
                    await this.sendEmailNotification(userId, title, message, type, actionUrl);
                    results.email = true;
                } catch (error) {
                    console.error('Failed to send email notification:', error);
                }
            }

            // 3. Send SMS notification (if enabled or forced)
            if ((forceSMS || preferences.enable_sms) &&
                await notificationPreferencesDAL.shouldNotify(userId, type, 'sms')) {

                try {
                    await this.sendSMSNotification(userId, message);
                    results.sms = true;
                } catch (error) {
                    console.error('Failed to send SMS notification:', error);
                }
            }

            // 4. Send push notification (if enabled)
            if (preferences.enable_push &&
                await notificationPreferencesDAL.shouldNotify(userId, type, 'push')) {

                try {
                    await this.sendPushNotification(userId, title, message, actionUrl, icon);
                    results.push = true;
                } catch (error) {
                    console.error('Failed to send push notification:', error);
                }
            }

            return results;

        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to multiple users
     * @param {Array<number>} userIds - Array of user IDs
     * @param {object} notificationData - Notification data
     */
    async sendBulkNotification(userIds, notificationData) {
        const results = [];

        for (const userId of userIds) {
            try {
                const result = await this.sendNotification({
                    userId,
                    ...notificationData
                });
                results.push({ userId, success: true, channels: result });
            } catch (error) {
                console.error(`Failed to send notification to user ${userId}:`, error);
                results.push({ userId, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Send email notification
     * @param {number} userId - User ID
     * @param {string} title - Email subject
     * @param {string} message - Email message
     * @param {string} type - Notification type
     * @param {string} actionUrl - Action URL
     */
    async sendEmailNotification(userId, title, message, type, actionUrl) {
        const db = require('../../DAL/dbConnection');

        // Get user email
        const [users] = await db.execute(
            `SELECT email, full_name FROM users WHERE user_id = ? AND email_verified = TRUE`,
            [userId]
        );

        if (users.length === 0) {
            console.log(`User ${userId} has no verified email, skipping email notification`);
            return;
        }

        const user = users[0];

        // Send email
        await emailService.sendNotificationEmail(
            user.email,
            user.full_name,
            title,
            message,
            actionUrl
        );
    }

    /**
     * Send SMS notification
     * @param {number} userId - User ID
     * @param {string} message - SMS message
     */
    async sendSMSNotification(userId, message) {
        // TODO: Implement SMS service (Twilio, etc.)
        console.log(`SMS notification to user ${userId}: ${message}`);
        // Placeholder for SMS integration
    }

    /**
     * Send push notification
     * @param {number} userId - User ID
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} actionUrl - Action URL
     * @param {string} icon - Icon
     */
    async sendPushNotification(userId, title, message, actionUrl, icon) {
        const db = require('../../DAL/dbConnection');
        const webpush = require('web-push');

        // Get active push subscriptions for user
        const [subscriptions] = await db.execute(
            `SELECT * FROM push_subscriptions
             WHERE user_id = ? AND is_active = TRUE`,
            [userId]
        );

        if (subscriptions.length === 0) {
            console.log(`User ${userId} has no active push subscriptions`);
            return;
        }

        // Setup web-push VAPID keys (should be in .env)
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@powershare.com';

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.warn('VAPID keys not configured, skipping push notification');
            return;
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        // Prepare payload
        const payload = JSON.stringify({
            title,
            body: message,
            icon: icon || '/images/notification-icon.png',
            badge: '/images/badge-icon.png',
            url: actionUrl || '/',
            timestamp: Date.now()
        });

        // Send to all active subscriptions
        const promises = subscriptions.map(async (sub) => {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh_key,
                        auth: sub.auth_key
                    }
                };

                await webpush.sendNotification(pushSubscription, payload);

                // Update last used timestamp
                await db.execute(
                    `UPDATE push_subscriptions SET last_used_at = NOW() WHERE subscription_id = ?`,
                    [sub.subscription_id]
                );

            } catch (error) {
                // If subscription is invalid, mark as inactive
                if (error.statusCode === 410) {
                    await db.execute(
                        `UPDATE push_subscriptions SET is_active = FALSE WHERE subscription_id = ?`,
                        [sub.subscription_id]
                    );
                }
                console.error(`Failed to send push to subscription ${sub.subscription_id}:`, error);
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Notify all subscribers of a generator
     * @param {number} generatorId - Generator ID
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {string} actionUrl - Optional action URL
     */
    async notifyGeneratorSubscribers(generatorId, title, message, type, actionUrl = null) {
        const db = require('../../DAL/dbConnection');

        // Get all active subscribers
        const [subscribers] = await db.execute(
            `SELECT DISTINCT user_id FROM subscriptions
             WHERE generator_id = ? AND status = 'active'`,
            [generatorId]
        );

        const userIds = subscribers.map(s => s.user_id);

        return await this.sendBulkNotification(userIds, {
            title,
            message,
            type,
            actionUrl
        });
    }

    /**
     * Broadcast system notification to all users
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} role - Optional role filter (admin, owner, user)
     */
    async broadcastSystemNotification(title, message, role = null) {
        const db = require('../../DAL/dbConnection');

        // Get all users (or filtered by role)
        let query = `SELECT user_id FROM users WHERE is_active = TRUE`;
        const params = [];

        if (role) {
            query += ` AND role = ?`;
            params.push(role);
        }

        const [users] = await db.execute(query, params);
        const userIds = users.map(u => u.user_id);

        return await this.sendBulkNotification(userIds, {
            title,
            message,
            type: 'system'
        });
    }
}

module.exports = new RealtimeNotificationService();
