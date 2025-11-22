const notificationDAL = require('../../DAL/notificationDAL');

class NotificationController {
    async getMyNotifications(req, res) {
        try {
            const userId = req.user.user_id;
            const { limit } = req.query;

            const notifications = await notificationDAL.getByUserId(userId, limit);

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }
    }

    async getUnreadNotifications(req, res) {
        try {
            const userId = req.user.user_id;
            const notifications = await notificationDAL.getUnreadByUserId(userId);

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Get unread notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }
    }

    async getUnreadCount(req, res) {
        try {
            const userId = req.user.user_id;
            const count = await notificationDAL.getUnreadCount(userId);

            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch count'
            });
        }
    }

    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;

            await notificationDAL.markAsRead(notificationId);

            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification'
            });
        }
    }

    async markAllAsRead(req, res) {
        try {
            const userId = req.user.user_id;

            await notificationDAL.markAllAsRead(userId);

            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notifications'
            });
        }
    }

    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;

            await notificationDAL.deleteNotification(notificationId);

            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notification'
            });
        }
    }

    async deleteAllNotifications(req, res) {
        try {
            const userId = req.user.user_id;

            await notificationDAL.deleteAllByUserId(userId);

            res.json({
                success: true,
                message: 'All notifications deleted successfully'
            });
        } catch (error) {
            console.error('Delete all notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete all notifications'
            });
        }
    }
}

module.exports = new NotificationController();