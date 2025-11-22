const db = require('./dbConnection');

class NotificationDAL {
    async createNotification(notificationData) {
        const { user_id, title, message, type } = notificationData;

        const [result] = await db.execute(
            `INSERT INTO notifications (user_id, title, message, type) 
             VALUES (?, ?, ?, ?)`,
            [user_id, title, message, type]
        );

        return result.insertId;
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

    async markAsRead(notificationId) {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
            [notificationId]
        );
    }

    async markAllAsRead(userId) {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [userId]
        );
    }

    async deleteNotification(notificationId) {
        await db.execute('DELETE FROM notifications WHERE notification_id = ?', [notificationId]);
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