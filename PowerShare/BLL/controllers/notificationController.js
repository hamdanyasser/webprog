const notificationDAL = require('../../DAL/notificationDAL');
const db = require('../../DAL/dbConnection');

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

    /**
     * Get notifications with advanced filtering, search, and pagination
     */
    async getNotificationsAdvanced(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                page = 1,
                limit = 20,
                type,
                status, // 'read', 'unread', 'all'
                search,
                dateFrom,
                dateTo,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = req.query;

            const offset = (page - 1) * limit;

            // Build WHERE clause
            let whereConditions = ['user_id = ?'];
            let params = [userId];

            // Filter by type
            if (type && type !== 'all') {
                whereConditions.push('type = ?');
                params.push(type);
            }

            // Filter by read/unread status
            if (status === 'read') {
                whereConditions.push('is_read = TRUE');
            } else if (status === 'unread') {
                whereConditions.push('is_read = FALSE');
            }

            // Search in title and message
            if (search) {
                whereConditions.push('(title LIKE ? OR message LIKE ?)');
                params.push(`%${search}%`, `%${search}%`);
            }

            // Date range filter
            if (dateFrom) {
                whereConditions.push('created_at >= ?');
                params.push(dateFrom);
            }
            if (dateTo) {
                whereConditions.push('created_at <= ?');
                params.push(dateTo);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const [countResult] = await db.execute(
                `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
                params
            );
            const total = countResult[0].total;

            // Get notifications with pagination
            const [notifications] = await db.execute(
                `SELECT * FROM notifications
                 WHERE ${whereClause}
                 ORDER BY ${sortBy} ${sortOrder}
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get advanced notifications error:', error);
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

    /**
     * Get notification statistics for user
     */
    async getStatistics(req, res) {
        try {
            const userId = req.user.user_id;

            // Get overall stats
            const [stats] = await db.execute(
                `SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread,
                    SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as read
                 FROM notifications
                 WHERE user_id = ?`,
                [userId]
            );

            // Get stats by type
            const [typeStats] = await db.execute(
                `SELECT
                    type,
                    COUNT(*) as count,
                    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread
                 FROM notifications
                 WHERE user_id = ?
                 GROUP BY type
                 ORDER BY count DESC`,
                [userId]
            );

            // Get recent activity (last 30 days)
            const [recentActivity] = await db.execute(
                `SELECT
                    DATE(created_at) as date,
                    COUNT(*) as count
                 FROM notifications
                 WHERE user_id = ?
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date DESC`,
                [userId]
            );

            // Response rate (how quickly user reads notifications)
            const [responseRate] = await db.execute(
                `SELECT
                    AVG(TIMESTAMPDIFF(MINUTE, created_at, read_at)) as avg_response_minutes
                 FROM notifications
                 WHERE user_id = ?
                 AND is_read = TRUE
                 AND read_at IS NOT NULL`,
                [userId]
            );

            res.json({
                success: true,
                data: {
                    overall: stats[0],
                    byType: typeStats,
                    recentActivity,
                    avgResponseTime: responseRate[0].avg_response_minutes || 0
                }
            });
        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics'
            });
        }
    }

    /**
     * Bulk delete notifications
     */
    async bulkDelete(req, res) {
        try {
            const userId = req.user.user_id;
            const { notificationIds, deleteType } = req.body;

            if (deleteType === 'read') {
                // Delete all read notifications
                await db.execute(
                    `DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE`,
                    [userId]
                );
            } else if (deleteType === 'old') {
                // Delete notifications older than 30 days
                await db.execute(
                    `DELETE FROM notifications
                     WHERE user_id = ?
                     AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                    [userId]
                );
            } else if (deleteType === 'type') {
                // Delete by type
                const { type } = req.body;
                await db.execute(
                    `DELETE FROM notifications WHERE user_id = ? AND type = ?`,
                    [userId, type]
                );
            } else if (notificationIds && Array.isArray(notificationIds)) {
                // Delete specific notifications
                const placeholders = notificationIds.map(() => '?').join(',');
                await db.execute(
                    `DELETE FROM notifications
                     WHERE user_id = ? AND notification_id IN (${placeholders})`,
                    [userId, ...notificationIds]
                );
            }

            res.json({
                success: true,
                message: 'Notifications deleted successfully'
            });
        } catch (error) {
            console.error('Bulk delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notifications'
            });
        }
    }

    /**
     * Bulk mark as read
     */
    async bulkMarkAsRead(req, res) {
        try {
            const userId = req.user.user_id;
            const { notificationIds, markType } = req.body;

            if (markType === 'all') {
                // Mark all as read
                await notificationDAL.markAllAsRead(userId);
            } else if (markType === 'type') {
                // Mark all of a specific type as read
                const { type } = req.body;
                await db.execute(
                    `UPDATE notifications
                     SET is_read = TRUE, read_at = NOW()
                     WHERE user_id = ? AND type = ? AND is_read = FALSE`,
                    [userId, type]
                );
            } else if (notificationIds && Array.isArray(notificationIds)) {
                // Mark specific notifications as read
                const placeholders = notificationIds.map(() => '?').join(',');
                await db.execute(
                    `UPDATE notifications
                     SET is_read = TRUE, read_at = NOW()
                     WHERE user_id = ? AND notification_id IN (${placeholders})`,
                    [userId, ...notificationIds]
                );
            }

            res.json({
                success: true,
                message: 'Notifications marked as read'
            });
        } catch (error) {
            console.error('Bulk mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notifications as read'
            });
        }
    }

    /**
     * Export notifications to CSV
     */
    async exportToCSV(req, res) {
        try {
            const userId = req.user.user_id;
            const { type, status, dateFrom, dateTo } = req.query;

            // Build WHERE clause
            let whereConditions = ['user_id = ?'];
            let params = [userId];

            if (type && type !== 'all') {
                whereConditions.push('type = ?');
                params.push(type);
            }

            if (status === 'read') {
                whereConditions.push('is_read = TRUE');
            } else if (status === 'unread') {
                whereConditions.push('is_read = FALSE');
            }

            if (dateFrom) {
                whereConditions.push('created_at >= ?');
                params.push(dateFrom);
            }
            if (dateTo) {
                whereConditions.push('created_at <= ?');
                params.push(dateTo);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get notifications
            const [notifications] = await db.execute(
                `SELECT
                    notification_id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at,
                    read_at
                 FROM notifications
                 WHERE ${whereClause}
                 ORDER BY created_at DESC`,
                params
            );

            // Convert to CSV
            const csvHeaders = ['ID', 'Title', 'Message', 'Type', 'Status', 'Created At', 'Read At'];
            const csvRows = notifications.map(n => [
                n.notification_id,
                `"${n.title.replace(/"/g, '""')}"`,
                `"${n.message.replace(/"/g, '""')}"`,
                n.type,
                n.is_read ? 'Read' : 'Unread',
                new Date(n.created_at).toISOString(),
                n.read_at ? new Date(n.read_at).toISOString() : 'N/A'
            ]);

            const csv = [
                csvHeaders.join(','),
                ...csvRows.map(row => row.join(','))
            ].join('\n');

            // Set headers for file download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="notifications_${Date.now()}.csv"`);
            res.send(csv);
        } catch (error) {
            console.error('Export to CSV error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export notifications'
            });
        }
    }

    /**
     * Get grouped notifications (by date)
     */
    async getGrouped(req, res) {
        try {
            const userId = req.user.user_id;
            const { groupBy = 'date', limit = 100 } = req.query;

            let groupByClause;
            let selectClause;

            if (groupBy === 'date') {
                groupByClause = 'DATE(created_at)';
                selectClause = 'DATE(created_at) as group_key';
            } else if (groupBy === 'type') {
                groupByClause = 'type';
                selectClause = 'type as group_key';
            } else if (groupBy === 'week') {
                groupByClause = 'YEARWEEK(created_at)';
                selectClause = 'YEARWEEK(created_at) as group_key';
            }

            const [grouped] = await db.execute(
                `SELECT
                    ${selectClause},
                    COUNT(*) as count,
                    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'notification_id', notification_id,
                            'title', title,
                            'message', message,
                            'type', type,
                            'icon', icon,
                            'action_url', action_url,
                            'is_read', is_read,
                            'created_at', created_at
                        )
                    ) as notifications
                 FROM notifications
                 WHERE user_id = ?
                 GROUP BY ${groupByClause}
                 ORDER BY ${groupByClause} DESC
                 LIMIT ?`,
                [userId, parseInt(limit)]
            );

            res.json({
                success: true,
                data: grouped.map(g => ({
                    ...g,
                    notifications: JSON.parse(g.notifications)
                }))
            });
        } catch (error) {
            console.error('Get grouped notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch grouped notifications'
            });
        }
    }
}

module.exports = new NotificationController();