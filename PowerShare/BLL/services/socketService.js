/**
 * Socket.IO Service
 * Manages real-time WebSocket connections and notifications
 */

const jwt = require('jsonwebtoken');

class SocketService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // Map of userId -> Set of socket IDs
    }

    /**
     * Initialize Socket.IO with the HTTP server
     * @param {http.Server} server - HTTP server instance
     */
    initialize(server) {
        const { Server } = require('socket.io');

        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || ['http://localhost:3000'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                // Get token from handshake auth or query
                const token = socket.handshake.auth.token || socket.handshake.query.token;

                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                // Verify JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                socket.userRole = decoded.role;

                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        });

        // Connection handler
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        console.log('✅ Socket.IO initialized successfully');
    }

    /**
     * Handle new socket connection
     * @param {Socket} socket - Socket.IO socket instance
     */
    handleConnection(socket) {
        const userId = socket.userId;

        console.log(`🔌 User ${userId} connected (socket: ${socket.id})`);

        // Track user's sockets
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Join role-based rooms
        socket.join(`role:${socket.userRole}`);

        // Send connection confirmation
        socket.emit('connected', {
            message: 'Connected to PowerShare real-time notifications',
            userId: userId,
            socketId: socket.id
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });

        // Handle mark as read
        socket.on('notification:markAsRead', async (data) => {
            try {
                const notificationDAL = require('../../DAL/notificationDAL');
                await notificationDAL.markAsRead(data.notificationId, userId);

                socket.emit('notification:marked', {
                    notificationId: data.notificationId,
                    success: true
                });

                // Broadcast updated unread count
                this.emitUnreadCount(userId);
            } catch (error) {
                console.error('Error marking notification as read:', error);
                socket.emit('notification:error', { message: error.message });
            }
        });

        // Handle mark all as read
        socket.on('notification:markAllAsRead', async () => {
            try {
                const notificationDAL = require('../../DAL/notificationDAL');
                await notificationDAL.markAllAsRead(userId);

                socket.emit('notification:allMarked', { success: true });

                // Broadcast updated unread count
                this.emitUnreadCount(userId);
            } catch (error) {
                console.error('Error marking all notifications as read:', error);
                socket.emit('notification:error', { message: error.message });
            }
        });

        // Handle delete notification
        socket.on('notification:delete', async (data) => {
            try {
                const notificationDAL = require('../../DAL/notificationDAL');
                await notificationDAL.deleteNotification(data.notificationId, userId);

                socket.emit('notification:deleted', {
                    notificationId: data.notificationId,
                    success: true
                });

                // Broadcast updated unread count
                this.emitUnreadCount(userId);
            } catch (error) {
                console.error('Error deleting notification:', error);
                socket.emit('notification:error', { message: error.message });
            }
        });

        // Send initial unread count
        this.emitUnreadCount(userId);
    }

    /**
     * Handle socket disconnection
     * @param {Socket} socket - Socket.IO socket instance
     */
    handleDisconnection(socket) {
        const userId = socket.userId;

        console.log(`🔌 User ${userId} disconnected (socket: ${socket.id})`);

        // Remove from user's socket set
        if (this.userSockets.has(userId)) {
            this.userSockets.get(userId).delete(socket.id);

            // Remove user entry if no more sockets
            if (this.userSockets.get(userId).size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Send notification to specific user
     * @param {number} userId - User ID
     * @param {object} notification - Notification data
     */
    async sendToUser(userId, notification) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return;
        }

        // Format notification
        const formattedNotification = {
            notification_id: notification.notification_id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            action_url: notification.action_url,
            icon: notification.icon || this.getIconForType(notification.type),
            is_read: false,
            created_at: notification.created_at || new Date()
        };

        // Emit to user's room
        this.io.to(`user:${userId}`).emit('notification:new', formattedNotification);

        console.log(`📨 Sent notification to user ${userId}: ${notification.title}`);

        // Update unread count
        await this.emitUnreadCount(userId);
    }

    /**
     * Send notification to multiple users
     * @param {Array<number>} userIds - Array of user IDs
     * @param {object} notification - Notification data
     */
    async sendToUsers(userIds, notification) {
        for (const userId of userIds) {
            await this.sendToUser(userId, notification);
        }
    }

    /**
     * Broadcast to all users with specific role
     * @param {string} role - User role (admin, owner, user)
     * @param {object} notification - Notification data
     */
    async broadcastToRole(role, notification) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return;
        }

        const formattedNotification = {
            notification_id: notification.notification_id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            action_url: notification.action_url,
            icon: notification.icon || this.getIconForType(notification.type),
            is_read: false,
            created_at: notification.created_at || new Date()
        };

        this.io.to(`role:${role}`).emit('notification:new', formattedNotification);

        console.log(`📨 Broadcast notification to role ${role}: ${notification.title}`);
    }

    /**
     * Broadcast to all connected users
     * @param {object} notification - Notification data
     */
    async broadcastToAll(notification) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return;
        }

        const formattedNotification = {
            notification_id: notification.notification_id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            action_url: notification.action_url,
            icon: notification.icon || this.getIconForType(notification.type),
            is_read: false,
            created_at: notification.created_at || new Date()
        };

        this.io.emit('notification:new', formattedNotification);

        console.log(`📨 Broadcast notification to all users: ${notification.title}`);
    }

    /**
     * Send unread notification count to user
     * @param {number} userId - User ID
     */
    async emitUnreadCount(userId) {
        try {
            const notificationDAL = require('../../DAL/notificationDAL');
            const count = await notificationDAL.getUnreadCount(userId);

            this.io.to(`user:${userId}`).emit('notification:unreadCount', {
                count: count
            });
        } catch (error) {
            console.error('Error emitting unread count:', error);
        }
    }

    /**
     * Check if user is online
     * @param {number} userId - User ID
     * @returns {boolean} - True if user has active connections
     */
    isUserOnline(userId) {
        return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
    }

    /**
     * Get online user count
     * @returns {number} - Number of online users
     */
    getOnlineUserCount() {
        return this.userSockets.size;
    }

    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} - Icon name/emoji
     */
    getIconForType(type) {
        const icons = {
            bill: '💵',
            payment: '✅',
            outage: '⚡',
            loyalty: '⭐',
            subscription: '📦',
            reminder: '⏰',
            welcome: '👋',
            alert: '🔔',
            system: 'ℹ️'
        };

        return icons[type] || '🔔';
    }

    /**
     * Get Socket.IO instance
     * @returns {Server} - Socket.IO server instance
     */
    getIO() {
        return this.io;
    }
}

// Export singleton instance
module.exports = new SocketService();
