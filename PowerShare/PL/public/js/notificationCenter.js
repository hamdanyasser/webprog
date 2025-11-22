/**
 * PowerShare Notification Center
 * Real-time notification client using Socket.IO
 */

class NotificationCenter {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.initialized = false;
    }

    /**
     * Initialize the notification center
     */
    async init() {
        if (this.initialized) return;

        try {
            // Get auth token from cookie
            const token = this.getTokenFromCookie();

            if (!token) {
                console.warn('No auth token found, skipping notification center');
                return;
            }

            // Connect to Socket.IO
            this.socket = io({
                auth: { token },
                transports: ['websocket', 'polling']
            });

            this.setupSocketListeners();
            this.loadExistingNotifications();
            this.initialized = true;

            console.log('✅ Notification Center initialized');
        } catch (error) {
            console.error('Failed to initialize notification center:', error);
        }
    }

    /**
     * Setup Socket.IO event listeners
     */
    setupSocketListeners() {
        // Connection events
        this.socket.on('connected', (data) => {
            console.log('🔌 Connected to notification server:', data.socketId);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from notification server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
        });

        // Notification events
        this.socket.on('notification:new', (notification) => {
            this.handleNewNotification(notification);
        });

        this.socket.on('notification:unreadCount', (data) => {
            this.updateUnreadCount(data.count);
        });

        this.socket.on('notification:marked', (data) => {
            if (data.success) {
                this.markNotificationAsRead(data.notificationId);
            }
        });

        this.socket.on('notification:allMarked', (data) => {
            if (data.success) {
                this.markAllAsRead();
            }
        });

        this.socket.on('notification:deleted', (data) => {
            if (data.success) {
                this.removeNotification(data.notificationId);
            }
        });

        this.socket.on('notification:error', (data) => {
            console.error('Notification error:', data.message);
        });
    }

    /**
     * Load existing notifications from API
     */
    async loadExistingNotifications() {
        try {
            const response = await fetch('/api/notifications', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.notifications = data.data || [];
                this.renderNotifications();
                this.updateUnreadCount(this.notifications.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    /**
     * Handle new notification
     */
    handleNewNotification(notification) {
        console.log('📨 New notification:', notification);

        // Add to notifications array
        this.notifications.unshift(notification);

        // Keep only latest 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // Update UI
        this.renderNotifications();
        this.updateUnreadCount(this.unreadCount + 1);

        // Show browser notification if permission granted
        this.showBrowserNotification(notification);

        // Show toast notification
        this.showToast(notification);

        // Play notification sound
        this.playNotificationSound();
    }

    /**
     * Render notifications in dropdown
     */
    renderNotifications() {
        const container = document.getElementById('notification-list');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="dropdown-item text-center text-muted py-4">
                    <i class="fas fa-bell-slash"></i>
                    <p class="mb-0 mt-2">No notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="dropdown-item notification-item ${notification.is_read ? 'read' : 'unread'}"
                 data-id="${notification.notification_id}"
                 onclick="notificationCenter.handleNotificationClick(${notification.notification_id}, '${notification.action_url || ''}')">
                <div class="d-flex">
                    <div class="notification-icon me-2">
                        ${notification.icon || '🔔'}
                    </div>
                    <div class="flex-grow-1">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${this.formatTime(notification.created_at)}</div>
                    </div>
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-link"
                                onclick="event.stopPropagation(); notificationCenter.deleteNotification(${notification.notification_id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update unread count badge
     */
    updateUnreadCount(count) {
        this.unreadCount = count;

        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Update page title
        if (count > 0) {
            document.title = `(${count}) ${document.title.replace(/^\(\d+\)\s*/, '')}`;
        } else {
            document.title = document.title.replace(/^\(\d+\)\s*/, '');
        }
    }

    /**
     * Handle notification click
     */
    handleNotificationClick(notificationId, actionUrl) {
        // Mark as read
        this.markNotificationAsReadViaSocket(notificationId);

        // Navigate to action URL if exists
        if (actionUrl && actionUrl !== 'null') {
            window.location.href = actionUrl;
        }
    }

    /**
     * Mark notification as read via socket
     */
    markNotificationAsReadViaSocket(notificationId) {
        if (this.socket) {
            this.socket.emit('notification:markAsRead', { notificationId });
        }
    }

    /**
     * Mark all as read
     */
    markAllAsReadViaSocket() {
        if (this.socket) {
            this.socket.emit('notification:markAllAsRead');
        }
    }

    /**
     * Delete notification
     */
    deleteNotification(notificationId) {
        if (this.socket) {
            this.socket.emit('notification:delete', { notificationId });
        }
    }

    /**
     * Mark notification as read locally
     */
    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n.notification_id === notificationId);
        if (notification && !notification.is_read) {
            notification.is_read = true;
            this.renderNotifications();
        }
    }

    /**
     * Mark all as read locally
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.is_read = true);
        this.renderNotifications();
        this.updateUnreadCount(0);
    }

    /**
     * Remove notification locally
     */
    removeNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.notification_id === notificationId);
        if (index !== -1) {
            const wasUnread = !this.notifications[index].is_read;
            this.notifications.splice(index, 1);
            this.renderNotifications();

            if (wasUnread) {
                this.updateUnreadCount(Math.max(0, this.unreadCount - 1));
            }
        }
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotif = new Notification(notification.title, {
                body: notification.message,
                icon: '/images/notification-icon.png',
                badge: '/images/badge-icon.png',
                tag: `notification-${notification.notification_id}`,
                data: {
                    url: notification.action_url
                }
            });

            browserNotif.onclick = function() {
                window.focus();
                if (notification.action_url) {
                    window.location.href = notification.action_url;
                }
                this.close();
            };
        }
    }

    /**
     * Show toast notification
     */
    showToast(notification) {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-icon">${notification.icon || '🔔'}</div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Create toast container if doesn't exist
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Could not play notification sound:', e));
        } catch (e) {
            // Ignore if sound file doesn't exist
        }
    }

    /**
     * Format time ago
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    /**
     * Get token from cookie
     */
    getTokenFromCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                return value;
            }
        }
        return null;
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }
}

// Create global instance
const notificationCenter = new NotificationCenter();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => notificationCenter.init());
} else {
    notificationCenter.init();
}
