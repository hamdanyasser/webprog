-- =====================================================
-- PowerShare Complete Database Schema
-- =====================================================
-- This schema includes all features:
-- - Core subscription and billing system
-- - Loyalty & rewards system
-- - Email verification
-- - Automated billing
-- - Real-time notifications
-- - Digital wallet system
-- - Two-factor authentication
-- - Generator capacity tracking
-- =====================================================

DROP DATABASE IF EXISTS powershare_db2;
CREATE DATABASE powershare_db2;
USE powershare_db2;

-- Admin credentials:
-- Email: admin@gmail.com
-- Password: password123

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table with all enhancements
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    profile_image VARCHAR(255) DEFAULT NULL,
    role ENUM('household', 'owner', 'admin') DEFAULT 'household',
    status ENUM('active', 'suspended', 'inactive') DEFAULT 'active',

    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    reminder_notifications BOOLEAN DEFAULT TRUE,
    outage_alerts BOOLEAN DEFAULT TRUE,

    -- UI preferences
    theme ENUM('light', 'dark') DEFAULT 'light',

    -- Password reset
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,

    -- Loyalty system
    loyalty_points_balance INT DEFAULT 0,

    -- Email verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) DEFAULT NULL,
    email_verification_sent_at DATETIME DEFAULT NULL,

    -- Two-factor authentication
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    backup_codes JSON DEFAULT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_loyalty_points (loyalty_points_balance),
    INDEX idx_email_verified (email_verified),
    INDEX idx_verification_token (email_verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Generators table with capacity tracking
CREATE TABLE generators (
    generator_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    generator_name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity_kw DECIMAL(10,2),
    max_amperage INT NOT NULL DEFAULT 100 COMMENT 'Maximum capacity in Amperes',
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id),
    INDEX idx_status (status),
    INDEX idx_capacity (max_amperage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pricing plans
CREATE TABLE pricing_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    generator_id INT NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    amperage INT NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (generator_id) REFERENCES generators(generator_id) ON DELETE CASCADE,
    INDEX idx_generator (generator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriptions
CREATE TABLE subscriptions (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    generator_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (generator_id) REFERENCES generators(generator_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES pricing_plans(plan_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_generator (generator_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bills table with loyalty and discount features
CREATE TABLE bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    -- Loyalty and discount features
    early_payment_discount DECIMAL(10,2) DEFAULT 0,
    late_payment_fee DECIMAL(10,2) DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    points_discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) GENERATED ALWAYS AS
        (amount - early_payment_discount + late_payment_fee - points_discount_amount) STORED,

    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
    INDEX idx_subscription (subscription_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('card', 'cash', 'bank_transfer') NOT NULL,
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('completed', 'pending', 'failed') DEFAULT 'completed',

    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
    INDEX idx_bill (bill_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Outage schedules
CREATE TABLE outage_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    generator_id INT NOT NULL,
    outage_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (generator_id) REFERENCES generators(generator_id) ON DELETE CASCADE,
    INDEX idx_generator (generator_id),
    INDEX idx_date (outage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enhanced notifications table
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM(
        'outage',
        'bill',
        'payment',
        'system',
        'loyalty',
        'subscription',
        'reminder',
        'welcome',
        'alert'
    ) DEFAULT 'system',
    action_url VARCHAR(500),
    icon VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment methods
CREATE TABLE payment_methods (
    payment_method_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    card_type ENUM('visa', 'mastercard', 'amex', 'discover') NOT NULL,
    card_last_four VARCHAR(4) NOT NULL,
    card_holder_name VARCHAR(100) NOT NULL,
    expiry_month VARCHAR(2) NOT NULL,
    expiry_year VARCHAR(4) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_payment (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- LOYALTY SYSTEM TABLES
-- =====================================================

-- Loyalty points transactions
CREATE TABLE loyalty_points_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    points_amount INT NOT NULL,
    transaction_type ENUM('earned', 'redeemed', 'bonus', 'expired', 'adjustment') NOT NULL,
    reference_type ENUM('payment', 'bill', 'subscription', 'referral', 'manual') DEFAULT NULL,
    reference_id INT DEFAULT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_transactions (user_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loyalty tiers
CREATE TABLE loyalty_tiers (
    tier_id INT AUTO_INCREMENT PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    min_points INT NOT NULL,
    max_points INT DEFAULT NULL,
    benefits_description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_points_range (min_points, max_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Platform settings
CREATE TABLE platform_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- =====================================================

-- Notification preferences
CREATE TABLE notification_preferences (
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

-- Push subscriptions
CREATE TABLE push_subscriptions (
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

-- Notification queue
CREATE TABLE notification_queue (
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

-- =====================================================
-- DIGITAL WALLET TABLES
-- =====================================================

-- Wallets
CREATE TABLE wallets (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,

    -- Balances in different currencies
    balance_usd DECIMAL(10, 2) DEFAULT 0.00,
    balance_lbp DECIMAL(15, 2) DEFAULT 0.00,
    balance_eur DECIMAL(10, 2) DEFAULT 0.00,

    -- Default currency for user
    default_currency ENUM('USD', 'LBP', 'EUR') DEFAULT 'USD',

    -- Wallet status
    status ENUM('active', 'frozen', 'suspended') DEFAULT 'active',

    -- Low balance settings
    low_balance_threshold DECIMAL(10, 2) DEFAULT 10.00,
    low_balance_alerts_enabled BOOLEAN DEFAULT TRUE,
    last_low_balance_alert_at TIMESTAMP NULL,

    -- Auto top-up settings
    auto_topup_enabled BOOLEAN DEFAULT FALSE,
    auto_topup_threshold DECIMAL(10, 2) DEFAULT 5.00,
    auto_topup_amount DECIMAL(10, 2) DEFAULT 50.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Wallet transactions
CREATE TABLE wallet_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT NOT NULL,
    user_id INT NOT NULL,

    -- Transaction details
    type ENUM(
        'topup',           -- Add money to wallet
        'payment',         -- Pay bill from wallet
        'refund',          -- Refund to wallet
        'transfer_in',     -- Receive transfer from another user
        'transfer_out',    -- Send transfer to another user
        'withdrawal',      -- Withdraw from wallet
        'bonus',           -- Bonus credit
        'cashback',        -- Cashback reward
        'points_conversion', -- Loyalty points to wallet
        'adjustment'       -- Manual admin adjustment
    ) NOT NULL,

    -- Amount and currency
    amount DECIMAL(10, 2) NOT NULL,
    currency ENUM('USD', 'LBP', 'EUR') NOT NULL DEFAULT 'USD',

    -- Balance before and after
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,

    -- Transaction status
    status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',

    -- Reference information
    reference_type VARCHAR(50) NULL,
    reference_id INT NULL,

    -- Description and notes
    description TEXT,
    admin_notes TEXT NULL,

    -- Payment method (for top-ups)
    payment_method VARCHAR(50) NULL,
    payment_reference VARCHAR(255) NULL,

    -- Related user (for transfers)
    related_user_id INT NULL,

    -- Metadata
    metadata JSON NULL,

    -- Timestamps
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(user_id) ON DELETE SET NULL,

    INDEX idx_wallet (wallet_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Wallet top-up methods
CREATE TABLE wallet_top_up_methods (
    method_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Method details
    method_code VARCHAR(50) NOT NULL UNIQUE,
    method_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Method configuration
    method_type ENUM('online', 'offline', 'crypto') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    -- Limits
    min_amount DECIMAL(10, 2) DEFAULT 1.00,
    max_amount DECIMAL(10, 2) DEFAULT 10000.00,

    -- Fees
    fee_type ENUM('fixed', 'percentage', 'none') DEFAULT 'none',
    fee_flat DECIMAL(10, 2) DEFAULT 0.00,
    fee_percentage DECIMAL(5, 2) DEFAULT 0.00,

    -- Processing time
    processing_time VARCHAR(100),

    -- Supported currencies
    supported_currencies JSON,

    -- Display order
    display_order INT DEFAULT 0,

    -- Instructions
    instructions TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active (is_active),
    INDEX idx_type (method_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Wallet transfers
CREATE TABLE wallet_transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,

    -- From and To
    from_wallet_id INT NOT NULL,
    from_user_id INT NOT NULL,
    to_wallet_id INT NOT NULL,
    to_user_id INT NOT NULL,

    -- Amount
    amount DECIMAL(10, 2) NOT NULL,
    currency ENUM('USD', 'LBP', 'EUR') NOT NULL DEFAULT 'USD',

    -- Status
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',

    -- Description
    description TEXT,
    note TEXT,

    -- Related transactions
    sender_transaction_id INT NULL,
    receiver_transaction_id INT NULL,

    -- Timestamps
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (from_wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (from_user_id) REFERENCES users(user_id),
    FOREIGN KEY (to_wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (to_user_id) REFERENCES users(user_id),
    FOREIGN KEY (sender_transaction_id) REFERENCES wallet_transactions(transaction_id),
    FOREIGN KEY (receiver_transaction_id) REFERENCES wallet_transactions(transaction_id),

    INDEX idx_from_wallet (from_wallet_id),
    INDEX idx_to_wallet (to_wallet_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TWO-FACTOR AUTHENTICATION TABLES
-- =====================================================

-- Two-factor codes
CREATE TABLE two_factor_codes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trusted devices
CREATE TABLE trusted_devices (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert users (all with email_verified = TRUE as existing users)
INSERT INTO users (full_name, email, password_hash, phone, address, role, email_verified) VALUES
    ('Admin User', 'admin@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111111', 'Beirut, Lebanon', 'admin', TRUE),
    ('Owner User', 'owner@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111112', 'Beirut, Lebanon', 'owner', TRUE),
    ('Household One', 'house1@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111113', 'Beirut, Lebanon', 'household', TRUE),
    ('Household Two', 'house2@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111114', 'Beirut, Lebanon', 'household', TRUE),
    ('Household Three', 'house3@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111115', 'Beirut, Lebanon', 'household', TRUE);

-- Insert generators
INSERT INTO generators (owner_id, generator_name, location, capacity_kw, max_amperage, status) VALUES
    (2, 'Beirut Central Generator', 'Achrafieh, Beirut', 500.00, 2250, 'active'),
    (2, 'Hamra Power Station', 'Hamra, Beirut', 300.00, 1350, 'active');

-- Insert pricing plans
INSERT INTO pricing_plans (generator_id, plan_name, amperage, monthly_price, description) VALUES
    (1, 'Basic 3A', 3, 45.00, 'Perfect for small apartments'),
    (1, 'Standard 5A', 5, 75.00, 'Ideal for medium-sized homes'),
    (1, 'Premium 10A', 10, 135.00, 'Best for large homes and businesses'),
    (2, 'Basic 3A', 3, 40.00, 'Economy package'),
    (2, 'Standard 5A', 5, 70.00, 'Standard package');

-- Insert subscriptions
INSERT INTO subscriptions (user_id, generator_id, plan_id, start_date, status) VALUES
    (1, 1, 2, '2025-01-01', 'active'),
    (4, 1, 1, '2025-01-15', 'active'),
    (5, 2, 4, '2025-02-01', 'active');

-- Insert bills
INSERT INTO bills (subscription_id, amount, billing_period_start, billing_period_end, due_date, status) VALUES
    (1, 75.00, '2025-01-01', '2025-01-31', '2025-02-05', 'paid'),
    (1, 75.00, '2025-02-01', '2025-02-28', '2025-03-05', 'pending'),
    (2, 45.00, '2025-01-15', '2025-02-14', '2025-02-20', 'paid'),
    (3, 40.00, '2025-02-01', '2025-02-28', '2025-03-05', 'pending');

-- Insert payments
INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) VALUES
    (1, 75.00, 'card', 'TXN-2025-001', 'completed'),
    (3, 45.00, 'cash', 'TXN-2025-002', 'completed');

-- Insert outage schedules
INSERT INTO outage_schedules (generator_id, outage_date, start_time, end_time, notes) VALUES
    (1, '2025-11-03', '06:00:00', '09:00:00', 'Morning maintenance'),
    (1, '2025-11-03', '14:00:00', '17:00:00', 'Afternoon scheduled cut'),
    (1, '2025-11-04', '10:00:00', '13:00:00', 'Midday outage'),
    (2, '2025-11-03', '08:00:00', '11:00:00', 'Routine maintenance');

-- Insert notifications
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
    (1, 'Power Outage Alert', 'Scheduled outage today from 2:00 PM to 5:00 PM', 'outage', FALSE),
    (1, 'New Bill Available', 'Your February bill of $75.00 is now available', 'bill', FALSE),
    (4, 'Payment Successful', 'Your payment of $45.00 has been processed', 'payment', TRUE),
    (1, 'Welcome to PowerShare', 'Thank you for subscribing to our service', 'system', TRUE);

-- Insert payment methods
INSERT INTO payment_methods (user_id, card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default) VALUES
    (1, 'visa', '4242', 'Admin User', '12', '2026', TRUE),
    (1, 'mastercard', '8888', 'Admin User', '09', '2027', FALSE);

-- Insert loyalty tiers
INSERT INTO loyalty_tiers (tier_name, min_points, max_points, benefits_description, discount_percentage) VALUES
    ('Bronze', 0, 999, 'Entry level - Earn 1 point per $1 spent', 0.00),
    ('Silver', 1000, 4999, 'Silver member - Earn 1.2 points per $1 spent + 5% discount on bills', 5.00),
    ('Gold', 5000, NULL, 'Gold member - Earn 1.5 points per $1 spent + 10% discount on bills', 10.00);

-- Insert platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
    -- Loyalty settings
    ('loyalty_points_per_dollar', '1', 'number', 'Points earned per dollar spent'),
    ('points_redemption_value', '0.01', 'number', 'Dollar value of each point when redeemed'),
    ('min_points_to_redeem', '100', 'number', 'Minimum points required to redeem'),
    ('early_payment_discount_enabled', 'true', 'boolean', 'Enable early payment discounts'),
    ('early_payment_discount_percentage', '2', 'number', 'Discount percentage for early payments'),
    ('early_payment_days_threshold', '5', 'number', 'Days before due date to qualify for early payment discount'),
    ('late_payment_fee_enabled', 'true', 'boolean', 'Enable late payment fees'),
    ('late_payment_fee_percentage', '5', 'number', 'Late fee percentage of bill amount'),
    ('late_payment_grace_period_days', '3', 'number', 'Grace period in days after due date before applying late fee'),
    ('max_points_redemption_percentage', '50', 'number', 'Maximum percentage of bill that can be paid with points'),

    -- Billing settings
    ('automated_billing_enabled', 'true', 'boolean', 'Enable automated monthly bill generation'),
    ('billing_day_of_month', '1', 'number', 'Day of month to generate bills (1-28)'),
    ('payment_due_days', '7', 'number', 'Days after billing period end that payment is due'),
    ('send_bill_email_notifications', 'true', 'boolean', 'Send email notifications when bills are generated'),
    ('send_bill_sms_notifications', 'false', 'boolean', 'Send SMS notifications when bills are generated'),
    ('billing_reminder_days_before', '3', 'number', 'Days before due date to send payment reminders'),
    ('overdue_check_enabled', 'true', 'boolean', 'Enable automatic overdue bill checking'),

    -- Notification settings
    ('realtime_notifications_enabled', 'true', 'boolean', 'Enable real-time WebSocket notifications'),
    ('push_notifications_enabled', 'true', 'boolean', 'Enable browser push notifications'),
    ('notification_retention_days', '90', 'number', 'Days to keep notifications before auto-delete'),
    ('max_notifications_per_user', '100', 'number', 'Maximum notifications to keep per user'),

    -- Wallet settings
    ('wallet_enabled', 'true', 'boolean', 'Enable wallet functionality'),
    ('wallet_min_topup', '5.00', 'number', 'Minimum top-up amount (USD)'),
    ('wallet_max_topup', '10000.00', 'number', 'Maximum top-up amount (USD)'),
    ('wallet_transfer_enabled', 'true', 'boolean', 'Enable wallet-to-wallet transfers'),
    ('wallet_min_transfer', '1.00', 'number', 'Minimum transfer amount (USD)'),
    ('wallet_max_transfer', '5000.00', 'number', 'Maximum transfer amount (USD)'),
    ('wallet_withdrawal_enabled', 'false', 'boolean', 'Enable wallet withdrawals'),
    ('wallet_auto_topup_enabled', 'true', 'boolean', 'Enable auto top-up feature'),
    ('wallet_low_balance_threshold', '10.00', 'number', 'Default low balance threshold (USD)'),
    ('exchange_rate_usd_lbp', '89500.00', 'number', 'USD to LBP exchange rate'),
    ('exchange_rate_usd_eur', '0.92', 'number', 'USD to EUR exchange rate');

-- Insert wallet top-up methods
INSERT INTO wallet_top_up_methods
(method_code, method_name, description, method_type, is_active, min_amount, max_amount,
 fee_type, fee_flat, fee_percentage, processing_time, supported_currencies, display_order, instructions)
VALUES
    ('credit_card', 'Credit/Debit Card', 'Pay instantly with your credit or debit card', 'online', TRUE, 5.00, 5000.00,
     'percentage', 0.00, 2.50, 'Instant', '["USD", "EUR"]', 1,
     'Enter your card details and the amount you wish to add to your wallet. The funds will be available immediately.'),
    ('bank_transfer', 'Bank Transfer', 'Transfer money from your bank account', 'offline', TRUE, 10.00, 50000.00,
     'none', 0.00, 0.00, '1-3 business days', '["USD", "LBP", "EUR"]', 2,
     'Transfer money to our bank account and provide the reference number. Funds will be credited within 1-3 business days.'),
    ('cash', 'Cash Payment', 'Pay cash at our office or authorized agents', 'offline', TRUE, 5.00, 10000.00,
     'none', 0.00, 0.00, 'Instant upon verification', '["USD", "LBP", "EUR"]', 3,
     'Visit our office or an authorized agent to make a cash deposit. Bring your user ID for verification.'),
    ('omt', 'OMT', 'Pay using OMT (Lebanon)', 'online', TRUE, 5.00, 5000.00,
     'fixed', 1.00, 0.00, 'Instant', '["USD", "LBP"]', 4,
     'Use OMT to add funds to your wallet instantly. OMT fees may apply.'),
    ('whish', 'Whish Money', 'Pay using Whish Money (Lebanon)', 'online', TRUE, 5.00, 5000.00,
     'fixed', 1.00, 0.00, 'Instant', '["USD", "LBP"]', 5,
     'Use Whish Money to add funds to your wallet instantly.');

-- Create wallets for all users
INSERT INTO wallets (user_id, default_currency)
SELECT user_id, 'USD' FROM users;

-- Create notification preferences for all users
INSERT INTO notification_preferences (user_id)
SELECT user_id FROM users;

-- =====================================================
-- VIEWS
-- =====================================================

-- Active subscriptions view
CREATE VIEW active_subscriptions_view AS
SELECT
    s.subscription_id,
    u.full_name AS user_name,
    u.email AS user_email,
    g.generator_name,
    pp.plan_name,
    pp.monthly_price,
    s.start_date,
    s.status
FROM subscriptions s
    JOIN users u ON s.user_id = u.user_id
    JOIN generators g ON s.generator_id = g.generator_id
    JOIN pricing_plans pp ON s.plan_id = pp.plan_id
WHERE s.status = 'active';

-- Pending bills view
CREATE VIEW pending_bills_view AS
SELECT
    b.bill_id,
    u.full_name AS user_name,
    u.email AS user_email,
    g.generator_name,
    b.amount,
    b.due_date,
    DATEDIFF(b.due_date, CURRENT_DATE()) AS days_until_due
FROM bills b
    JOIN subscriptions s ON b.subscription_id = s.subscription_id
    JOIN users u ON s.user_id = u.user_id
    JOIN generators g ON s.generator_id = g.generator_id
WHERE b.status = 'pending';

-- Monthly revenue view
CREATE VIEW monthly_revenue_view AS
SELECT
    g.generator_id,
    g.generator_name,
    YEAR(p.payment_date) AS year,
    MONTH(p.payment_date) AS month,
    COUNT(p.payment_id) AS total_payments,
    SUM(p.amount) AS total_revenue
FROM payments p
    JOIN bills b ON p.bill_id = b.bill_id
    JOIN subscriptions s ON b.subscription_id = s.subscription_id
    JOIN generators g ON s.generator_id = g.generator_id
WHERE p.status = 'completed'
GROUP BY g.generator_id, YEAR(p.payment_date), MONTH(p.payment_date);

-- Generator capacity view
CREATE OR REPLACE VIEW generator_capacity_view AS
SELECT
    g.generator_id,
    g.generator_name,
    g.max_amperage,
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN pp.amperage ELSE 0 END), 0) AS used_amperage,
    g.max_amperage - COALESCE(SUM(CASE WHEN s.status = 'active' THEN pp.amperage ELSE 0 END), 0) AS available_amperage,
    ROUND((COALESCE(SUM(CASE WHEN s.status = 'active' THEN pp.amperage ELSE 0 END), 0) / g.max_amperage) * 100, 2) AS capacity_percentage,
    COUNT(CASE WHEN s.status = 'active' THEN 1 END) AS active_subscribers
FROM generators g
    LEFT JOIN subscriptions s ON g.generator_id = s.generator_id
    LEFT JOIN pricing_plans pp ON s.plan_id = pp.plan_id
GROUP BY g.generator_id, g.generator_name, g.max_amperage;

-- User loyalty tier view
CREATE OR REPLACE VIEW user_loyalty_tier_view AS
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.loyalty_points_balance,
    lt.tier_id,
    lt.tier_name,
    lt.benefits_description,
    lt.discount_percentage as tier_discount_percentage
FROM users u
    LEFT JOIN loyalty_tiers lt ON u.loyalty_points_balance >= lt.min_points
        AND (lt.max_points IS NULL OR u.loyalty_points_balance <= lt.max_points)
WHERE u.role IN ('household', 'owner');

-- Loyalty points summary view
CREATE OR REPLACE VIEW loyalty_points_summary_view AS
SELECT
    user_id,
    SUM(CASE WHEN points_amount > 0 THEN points_amount ELSE 0 END) as total_earned,
    SUM(CASE WHEN points_amount < 0 THEN ABS(points_amount) ELSE 0 END) as total_redeemed,
    COUNT(*) as total_transactions,
    MAX(created_at) as last_transaction_date
FROM loyalty_points_transactions
GROUP BY user_id;

-- User notification counts view
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

-- Wallet summary view
CREATE OR REPLACE VIEW wallet_summary AS
SELECT
    w.wallet_id,
    w.user_id,
    u.full_name,
    u.email,
    w.balance_usd,
    w.balance_lbp,
    w.balance_eur,
    w.default_currency,
    w.status,
    w.auto_topup_enabled,
    (
        SELECT COUNT(*)
        FROM wallet_transactions wt
        WHERE wt.wallet_id = w.wallet_id
        AND wt.status = 'completed'
    ) as total_transactions,
    (
        SELECT SUM(amount)
        FROM wallet_transactions wt
        WHERE wt.wallet_id = w.wallet_id
        AND wt.type = 'topup'
        AND wt.status = 'completed'
    ) as total_topups,
    (
        SELECT SUM(amount)
        FROM wallet_transactions wt
        WHERE wt.wallet_id = w.wallet_id
        AND wt.type = 'payment'
        AND wt.status = 'completed'
    ) as total_payments,
    w.created_at,
    w.updated_at
FROM wallets w
    JOIN users u ON w.user_id = u.user_id;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

DELIMITER //

-- Clean old notifications
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

-- Check low balance wallets
CREATE PROCEDURE CheckLowBalanceWallets()
BEGIN
    SELECT
        w.wallet_id,
        w.user_id,
        u.full_name,
        u.email,
        w.balance_usd,
        w.low_balance_threshold,
        w.last_low_balance_alert_at
    FROM wallets w
    JOIN users u ON w.user_id = u.user_id
    WHERE w.status = 'active'
    AND w.low_balance_alerts_enabled = TRUE
    AND w.balance_usd < w.low_balance_threshold
    AND (
        w.last_low_balance_alert_at IS NULL
        OR w.last_low_balance_alert_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    );
END //

DELIMITER ;

-- =====================================================
-- EVENTS
-- =====================================================

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Cleanup expired 2FA codes (runs every hour)
CREATE EVENT IF NOT EXISTS cleanup_expired_2fa_codes
ON SCHEDULE EVERY 1 HOUR
DO
    DELETE FROM two_factor_codes
    WHERE expires_at < NOW()
    OR (verified = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR));

-- Cleanup expired trusted devices (runs daily)
CREATE EVENT IF NOT EXISTS cleanup_expired_trusted_devices
ON SCHEDULE EVERY 1 DAY
DO
    DELETE FROM trusted_devices WHERE expires_at < NOW();

-- =====================================================
-- COMPLETION MESSAGES
-- =====================================================

SELECT 'Database created successfully!' AS Status;
SELECT 'All tables created with complete feature set!' AS Status;
SELECT 'Sample data inserted!' AS Status;
SELECT 'All views, stored procedures, and events configured!' AS Status;
SELECT '=====================================================';
SELECT 'PowerShare Database - Complete Setup';
SELECT 'Features included:';
SELECT '- Core subscription & billing system';
SELECT '- Loyalty & rewards program';
SELECT '- Email verification';
SELECT '- Automated billing';
SELECT '- Real-time notifications';
SELECT '- Digital wallet system';
SELECT '- Two-factor authentication';
SELECT '- Generator capacity tracking';
SELECT '=====================================================';
