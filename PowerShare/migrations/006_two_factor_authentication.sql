-- Migration: Two-Factor Authentication (2FA)
-- Description: Add 2FA support with email-based OTP codes
-- Date: 2025-01-22

USE powershare;

-- Add 2FA columns to users table
ALTER TABLE users
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE COMMENT 'Whether 2FA is enabled for this user',
ADD COLUMN backup_codes JSON DEFAULT NULL COMMENT 'Array of backup recovery codes (hashed)',
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create table for storing 2FA OTP codes
CREATE TABLE IF NOT EXISTS two_factor_codes (
    code_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(6) NOT NULL COMMENT '6-digit OTP code',
    code_hash VARCHAR(255) NOT NULL COMMENT 'Hashed version of the code',
    expires_at TIMESTAMP NOT NULL COMMENT 'When this code expires (10 minutes)',
    attempts INT DEFAULT 0 COMMENT 'Number of failed attempts',
    verified BOOLEAN DEFAULT FALSE COMMENT 'Whether code has been used',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_code_hash (code_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create table for trusted devices (remember this device)
CREATE TABLE IF NOT EXISTS trusted_devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique token for this device',
    device_name VARCHAR(255) DEFAULT NULL COMMENT 'Browser/device identifier',
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP address when device was trusted',
    user_agent TEXT DEFAULT NULL COMMENT 'User agent string',
    expires_at TIMESTAMP NOT NULL COMMENT 'When trust expires (30 days)',
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_device_token (device_token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cleanup event for expired codes (runs every hour)
CREATE EVENT IF NOT EXISTS cleanup_expired_2fa_codes
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM two_factor_codes WHERE expires_at < NOW() OR (verified = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR));

-- Create cleanup event for expired trusted devices (runs daily)
CREATE EVENT IF NOT EXISTS cleanup_expired_trusted_devices
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM trusted_devices WHERE expires_at < NOW();

-- Insert sample backup codes for existing users who enable 2FA
-- (These will be generated properly when user enables 2FA)

COMMIT;

-- Verification queries
SELECT 'Two-Factor Authentication tables created successfully' AS status;
SELECT COUNT(*) AS total_users,
       SUM(CASE WHEN two_factor_enabled = TRUE THEN 1 ELSE 0 END) AS users_with_2fa
FROM users;
