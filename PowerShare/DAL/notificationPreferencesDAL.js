/**
 * Notification Preferences Data Access Layer
 * Handles database operations for user notification preferences
 */

const db = require('./dbConnection');

class NotificationPreferencesDAL {
    /**
     * Get user's notification preferences
     * @param {number} userId - User ID
     * @returns {object} - Notification preferences
     */
    async getUserPreferences(userId) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM notification_preferences WHERE user_id = ?`,
                [userId]
            );

            // If no preferences exist, create default ones
            if (rows.length === 0) {
                return await this.createDefaultPreferences(userId);
            }

            return rows[0];
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            throw error;
        }
    }

    /**
     * Create default preferences for a user
     * @param {number} userId - User ID
     * @returns {object} - Created preferences
     */
    async createDefaultPreferences(userId) {
        try {
            await db.execute(
                `INSERT INTO notification_preferences (user_id) VALUES (?)`,
                [userId]
            );

            return await this.getUserPreferences(userId);
        } catch (error) {
            console.error('Error creating default preferences:', error);
            throw error;
        }
    }

    /**
     * Update notification preferences
     * @param {number} userId - User ID
     * @param {object} preferences - Preferences to update
     * @returns {object} - Updated preferences
     */
    async updatePreferences(userId, preferences) {
        try {
            const allowedFields = [
                'enable_email',
                'enable_sms',
                'enable_push',
                'enable_in_app',
                'notify_bills',
                'notify_payments',
                'notify_outages',
                'notify_loyalty',
                'notify_subscriptions',
                'notify_reminders',
                'notify_system',
                'quiet_hours_enabled',
                'quiet_hours_start',
                'quiet_hours_end',
                'digest_enabled',
                'digest_frequency'
            ];

            const updates = [];
            const values = [];

            for (const [key, value] of Object.entries(preferences)) {
                if (allowedFields.includes(key)) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(userId);

            await db.execute(
                `UPDATE notification_preferences
                 SET ${updates.join(', ')}
                 WHERE user_id = ?`,
                values
            );

            return await this.getUserPreferences(userId);
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            throw error;
        }
    }

    /**
     * Check if user should receive notification based on preferences
     * @param {number} userId - User ID
     * @param {string} notificationType - Type of notification
     * @param {string} channel - Delivery channel (email, sms, push, in_app)
     * @returns {boolean} - True if user should receive notification
     */
    async shouldNotify(userId, notificationType, channel) {
        try {
            const prefs = await this.getUserPreferences(userId);

            // Check if channel is enabled
            const channelKey = `enable_${channel}`;
            if (prefs[channelKey] === false || prefs[channelKey] === 0) {
                return false;
            }

            // Check if notification type is enabled
            const typeMap = {
                bill: 'notify_bills',
                payment: 'notify_payments',
                outage: 'notify_outages',
                loyalty: 'notify_loyalty',
                subscription: 'notify_subscriptions',
                reminder: 'notify_reminders',
                system: 'notify_system',
                welcome: 'notify_system',
                alert: 'notify_system'
            };

            const typeKey = typeMap[notificationType];
            if (typeKey && (prefs[typeKey] === false || prefs[typeKey] === 0)) {
                return false;
            }

            // Check quiet hours
            if (prefs.quiet_hours_enabled) {
                if (this.isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking notification preference:', error);
            // Default to allowing notification if error
            return true;
        }
    }

    /**
     * Check if current time is within quiet hours
     * @param {string} startTime - Quiet hours start time (HH:MM:SS)
     * @param {string} endTime - Quiet hours end time (HH:MM:SS)
     * @returns {boolean} - True if in quiet hours
     */
    isInQuietHours(startTime, endTime) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMin] = startTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;

        const [endHour, endMin] = endTime.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;

        // Handle case where quiet hours span midnight
        if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        } else {
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        }
    }

    /**
     * Get all preferences for multiple users
     * @param {Array<number>} userIds - Array of user IDs
     * @returns {Array} - Array of preferences
     */
    async getBulkPreferences(userIds) {
        try {
            if (userIds.length === 0) return [];

            const placeholders = userIds.map(() => '?').join(',');
            const [rows] = await db.execute(
                `SELECT * FROM notification_preferences
                 WHERE user_id IN (${placeholders})`,
                userIds
            );

            return rows;
        } catch (error) {
            console.error('Error getting bulk preferences:', error);
            throw error;
        }
    }

    /**
     * Delete user preferences
     * @param {number} userId - User ID
     */
    async deletePreferences(userId) {
        try {
            await db.execute(
                `DELETE FROM notification_preferences WHERE user_id = ?`,
                [userId]
            );
        } catch (error) {
            console.error('Error deleting preferences:', error);
            throw error;
        }
    }

    /**
     * Get users who want digest notifications
     * @param {string} frequency - Digest frequency ('daily' or 'weekly')
     * @returns {Array} - Array of user IDs
     */
    async getUsersForDigest(frequency) {
        try {
            const [rows] = await db.execute(
                `SELECT user_id FROM notification_preferences
                 WHERE digest_enabled = TRUE
                 AND digest_frequency = ?`,
                [frequency]
            );

            return rows.map(row => row.user_id);
        } catch (error) {
            console.error('Error getting digest users:', error);
            throw error;
        }
    }
}

module.exports = new NotificationPreferencesDAL();
