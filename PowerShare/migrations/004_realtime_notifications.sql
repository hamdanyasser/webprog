-- Migration: Real-Time Notifications System
-- Description: Enhances notification system with preferences, push subscriptions, and expanded notification types
-- Date: 2025-01-22

-- ============================================
-- 1. Update notifications table with more types
-- ============================================

ALTER TABLE notifications
MODIFY COLUMN type ENUM(
    'outage',
    'bill',
    'payment',
    'system',
    'loyalty',
    'subscription',
    'reminder',
    'welcome',
    'alert'
) DEFAULT 'system';

-- Add action URL and icon for richer notifications
ALTER TABLE notifications
ADD COLUMN action_url VARCHAR(500) AFTER message,
ADD COLUMN icon VARCHAR(100) AFTER action_url,
ADD COLUMN read_at TIMESTAMP NULL AFTER is_read;

-- ============================================
-- 2. Create notification_preferences table
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,

    -- Channel preferences
    enable_email BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT FALSE,
    enable_push BOOLEAN DEFAULT TRUE,
    enable_in_app BOOLEAN DEFAULT TRUE,

    -- Notification type preferences
    notify_bills BOOLEAN DEFAULT TRUE,
    notify_payments BOOLEAN DEFAULT TRUE,
    notify_outages BOOLEAN DEFAULT TRUE,
    notify_loyalty BOOLEAN DEFAULT TRUE,
    notify_subscriptions BOOLEAN DEFAULT TRUE,
    notify_reminders BOOLEAN DEFAULT TRUE,
    notify_system BOOLEAN DEFAULT TRUE,

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',

    -- Frequency settings
    digest_enabled BOOLEAN DEFAULT FALSE,
    digest_frequency ENUM('daily', 'weekly') DEFAULT 'daily',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 3. Create push_subscriptions table
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,

    -- Push subscription details (from browser)
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,

    -- Device/browser info
    user_agent TEXT,
    device_name VARCHAR(200),
    browser VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 4. Create notification_queue table
-- ============================================

CREATE TABLE IF NOT EXISTS notification_queue (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM(
        'outage',
        'bill',
        'payment',
        'system',
        'loyalty',
        'subscription',
        'reminder',
        'welcome',
        'alert'
    ) NOT NULL,

    -- Notification content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    icon VARCHAR(100),

    -- Delivery channels
    send_email BOOLEAN DEFAULT FALSE,
    send_sms BOOLEAN DEFAULT FALSE,
    send_push BOOLEAN DEFAULT FALSE,
    send_in_app BOOLEAN DEFAULT TRUE,

    -- Delivery status
    status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    error_message TEXT,

    -- Scheduling
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 5. Insert default preferences for existing users
-- ============================================

INSERT INTO notification_preferences (user_id)
SELECT user_id FROM users
WHERE user_id NOT IN (SELECT user_id FROM notification_preferences);

-- ============================================
-- 6. Add notification statistics to platform_settings
-- ============================================

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description)
VALUES
    ('realtime_notifications_enabled', 'true', 'boolean', 'Enable real-time WebSocket notifications'),
    ('push_notifications_enabled', 'true', 'boolean', 'Enable browser push notifications'),
    ('notification_retention_days', '90', 'number', 'Days to keep notifications before auto-delete'),
    ('max_notifications_per_user', '100', 'number', 'Maximum notifications to keep per user')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ============================================
-- 7. Create view for unread notification counts
-- ============================================

CREATE OR REPLACE VIEW user_notification_counts AS
SELECT
    user_id,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count,
    SUM(CASE WHEN type = 'bill' AND is_read = FALSE THEN 1 ELSE 0 END) as unread_bills,
    SUM(CASE WHEN type = 'payment' AND is_read = FALSE THEN 1 ELSE 0 END) as unread_payments,
    SUM(CASE WHEN type = 'outage' AND is_read = FALSE THEN 1 ELSE 0 END) as unread_outages,
    SUM(CASE WHEN type = 'loyalty' AND is_read = FALSE THEN 1 ELSE 0 END) as unread_loyalty,
    MAX(created_at) as last_notification_at
FROM notifications
GROUP BY user_id;

-- ============================================
-- 8. Create stored procedure to clean old notifications
-- ============================================

DELIMITER //

CREATE PROCEDURE CleanOldNotifications()
BEGIN
    DECLARE retention_days INT;

    -- Get retention setting
    SELECT CAST(setting_value AS SIGNED) INTO retention_days
    FROM platform_settings
    WHERE setting_key = 'notification_retention_days';

    -- Delete old read notifications
    DELETE FROM notifications
    WHERE is_read = TRUE
    AND created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);

    -- Keep only the latest N notifications per user
    DELETE n1 FROM notifications n1
    INNER JOIN (
        SELECT user_id, notification_id
        FROM (
            SELECT user_id, notification_id,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM notifications
        ) ranked
        WHERE rn > (
            SELECT CAST(setting_value AS SIGNED)
            FROM platform_settings
            WHERE setting_key = 'max_notifications_per_user'
        )
    ) n2 ON n1.notification_id = n2.notification_id;
END //

DELIMITER ;

-- ============================================
-- Migration Complete
-- ============================================
