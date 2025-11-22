-- Migration: Digital Wallet System
-- Description: Complete wallet system with balance management, transactions, and multi-currency support
-- Date: 2025-01-22

-- ============================================
-- 1. Create wallets table
-- ============================================

CREATE TABLE IF NOT EXISTS wallets (
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

-- ============================================
-- 2. Create wallet_transactions table
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
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
    reference_type VARCHAR(50) NULL, -- 'bill', 'topup_method', 'user_transfer', etc.
    reference_id INT NULL,           -- ID of the related entity

    -- Description and notes
    description TEXT,
    admin_notes TEXT NULL,           -- For admin adjustments

    -- Payment method (for top-ups)
    payment_method VARCHAR(50) NULL, -- 'credit_card', 'bank_transfer', 'cash', 'paypal', etc.
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

-- ============================================
-- 3. Create wallet_top_up_methods table
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_top_up_methods (
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
    fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    fee_percentage DECIMAL(5, 2) DEFAULT 0.00,

    -- Processing time
    processing_time VARCHAR(100), -- e.g., "Instant", "1-3 business days"

    -- Supported currencies
    supported_currencies JSON, -- ["USD", "LBP", "EUR"]

    -- Display order
    display_order INT DEFAULT 0,

    -- Instructions
    instructions TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active (is_active),
    INDEX idx_type (method_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 4. Create wallet_transfers table
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transfers (
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
    message TEXT, -- Message from sender

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

-- ============================================
-- 5. Insert default top-up methods
-- ============================================

INSERT INTO wallet_top_up_methods
(method_code, method_name, description, method_type, is_active, min_amount, max_amount,
 fee_type, processing_time, supported_currencies, display_order, instructions)
VALUES
(
    'credit_card',
    'Credit/Debit Card',
    'Pay instantly with your credit or debit card',
    'online',
    TRUE,
    5.00,
    5000.00,
    'percentage',
    'Instant',
    '["USD", "EUR"]',
    1,
    'Enter your card details and the amount you wish to add to your wallet. The funds will be available immediately.'
),
(
    'bank_transfer',
    'Bank Transfer',
    'Transfer money from your bank account',
    'offline',
    TRUE,
    10.00,
    50000.00,
    'none',
    '1-3 business days',
    '["USD", "LBP", "EUR"]',
    2,
    'Transfer money to our bank account and provide the reference number. Funds will be credited within 1-3 business days.'
),
(
    'cash',
    'Cash Payment',
    'Pay cash at our office or authorized agents',
    'offline',
    TRUE,
    5.00,
    10000.00,
    'none',
    'Instant upon verification',
    '["USD", "LBP", "EUR"]',
    3,
    'Visit our office or an authorized agent to make a cash deposit. Bring your user ID for verification.'
),
(
    'omt',
    'OMT',
    'Pay using OMT (Lebanon)',
    'online',
    TRUE,
    5.00,
    5000.00,
    'fixed',
    'Instant',
    '["USD", "LBP"]',
    4,
    'Use OMT to add funds to your wallet instantly. OMT fees may apply.'
),
(
    'whish',
    'Whish Money',
    'Pay using Whish Money (Lebanon)',
    'online',
    TRUE,
    5.00,
    5000.00,
    'fixed',
    'Instant',
    '["USD", "LBP"]',
    5,
    'Use Whish Money to add funds to your wallet instantly.'
);

-- ============================================
-- 6. Create wallets for existing users
-- ============================================

INSERT INTO wallets (user_id, default_currency)
SELECT user_id, 'USD'
FROM users
WHERE user_id NOT IN (SELECT user_id FROM wallets);

-- ============================================
-- 7. Add wallet-related platform settings
-- ============================================

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description)
VALUES
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
    ('exchange_rate_usd_eur', '0.92', 'number', 'USD to EUR exchange rate')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ============================================
-- 8. Create view for wallet summary
-- ============================================

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

-- ============================================
-- 9. Create stored procedure for balance check
-- ============================================

DELIMITER //

CREATE PROCEDURE CheckLowBalanceWallets()
BEGIN
    -- Get wallets with low balance
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

-- ============================================
-- Migration Complete
-- ============================================
