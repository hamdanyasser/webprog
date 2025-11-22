const db = require('./dbConnection');

class NotificationDAL {
    async createNotification(notificationData) {
        const {
            user_id,
            title,
            message,
            type = 'system',
            action_url = null,
            icon = null
        } = notificationData;

        const [result] = await db.execute(
            `INSERT INTO notifications (user_id, title, message, type, action_url, icon)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, title, message, type, action_url, icon]
        );

        const notificationId = result.insertId;

        // Return the full notification object for real-time broadcasting
        const [rows] = await db.execute(
            `SELECT * FROM notifications WHERE notification_id = ?`,
            [notificationId]
        );

        return rows[0];
    }

    async getByUserId(userId, limit = 50) {
        const [rows] = await db.execute(
            `SELECT * FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    async getUnreadByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT * FROM notifications
             WHERE user_id = ? AND is_read = FALSE
             ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    }

    async markAsRead(notificationId, userId = null) {
        const now = new Date();

        if (userId) {
            // Verify ownership before marking as read
            await db.execute(
                `UPDATE notifications
                 SET is_read = TRUE, read_at = ?
                 WHERE notification_id = ? AND user_id = ?`,
                [now, notificationId, userId]
            );
        } else {
            await db.execute(
                `UPDATE notifications
                 SET is_read = TRUE, read_at = ?
                 WHERE notification_id = ?`,
                [now, notificationId]
            );
        }
    }

    async markAllAsRead(userId) {
        const now = new Date();

        await db.execute(
            `UPDATE notifications
             SET is_read = TRUE, read_at = ?
             WHERE user_id = ? AND is_read = FALSE`,
            [now, userId]
        );
    }

    async deleteNotification(notificationId, userId = null) {
        if (userId) {
            // Verify ownership before deleting
            await db.execute(
                `DELETE FROM notifications
                 WHERE notification_id = ? AND user_id = ?`,
                [notificationId, userId]
            );
        } else {
            await db.execute(
                `DELETE FROM notifications WHERE notification_id = ?`,
                [notificationId]
            );
        }
    }

    async deleteAllByUserId(userId) {
        await db.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
    }

    async notifySubscribers(generatorId, title, message, type) {
        await db.execute(
            `INSERT INTO notifications (user_id, title, message, type)
             SELECT s.user_id, ?, ?, ?
             FROM subscriptions s
             WHERE s.generator_id = ? AND s.status = 'active'`,
            [title, message, type, generatorId]
        );
    }

    async getUnreadCount(userId) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = new NotificationDAL();