-- =====================================================
-- PowerShare Loyalty & Rewards System Migration
-- =====================================================
-- This migration adds loyalty points, early payment discounts,
-- and late payment fee functionality

USE powershare_db2;

-- =====================================================
-- 1. Add loyalty points balance to users table
-- =====================================================
ALTER TABLE users
ADD COLUMN loyalty_points_balance INT DEFAULT 0 AFTER theme,
ADD INDEX idx_loyalty_points (loyalty_points_balance);

-- =====================================================
-- 2. Create loyalty_points_transactions table
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
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

-- =====================================================
-- 3. Create loyalty_tiers table
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    tier_id INT AUTO_INCREMENT PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    min_points INT NOT NULL,
    max_points INT DEFAULT NULL,
    benefits_description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_points_range (min_points, max_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default tiers
INSERT INTO loyalty_tiers (tier_name, min_points, max_points, benefits_description, discount_percentage) VALUES
('Bronze', 0, 999, 'Entry level - Earn 1 point per $1 spent', 0.00),
('Silver', 1000, 4999, 'Silver member - Earn 1.2 points per $1 spent + 5% discount on bills', 5.00),
('Gold', 5000, NULL, 'Gold member - Earn 1.5 points per $1 spent + 10% discount on bills', 10.00);

-- =====================================================
-- 4. Add discount and fee columns to bills table
-- =====================================================
ALTER TABLE bills
ADD COLUMN early_payment_discount DECIMAL(10,2) DEFAULT 0 AFTER amount,
ADD COLUMN late_payment_fee DECIMAL(10,2) DEFAULT 0 AFTER early_payment_discount,
ADD COLUMN points_redeemed INT DEFAULT 0 AFTER late_payment_fee,
ADD COLUMN points_discount_amount DECIMAL(10,2) DEFAULT 0 AFTER points_redeemed,
ADD COLUMN final_amount DECIMAL(10,2) GENERATED ALWAYS AS
    (amount - early_payment_discount + late_payment_fee - points_discount_amount) STORED;

-- =====================================================
-- 5. Create platform_settings table
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
('loyalty_points_per_dollar', '1', 'number', 'Points earned per dollar spent'),
('points_redemption_value', '0.01', 'number', 'Dollar value of each point when redeemed (e.g., 0.01 = 100 points = $1)'),
('min_points_to_redeem', '100', 'number', 'Minimum points required to redeem'),
('early_payment_discount_enabled', 'true', 'boolean', 'Enable early payment discounts'),
('early_payment_discount_percentage', '2', 'number', 'Discount percentage for early payments'),
('early_payment_days_threshold', '5', 'number', 'Days before due date to qualify for early payment discount'),
('late_payment_fee_enabled', 'true', 'boolean', 'Enable late payment fees'),
('late_payment_fee_percentage', '5', 'number', 'Late fee percentage of bill amount'),
('late_payment_grace_period_days', '3', 'number', 'Grace period in days after due date before applying late fee'),
('max_points_redemption_percentage', '50', 'number', 'Maximum percentage of bill that can be paid with points');

-- =====================================================
-- 6. Create view for user loyalty tier
-- =====================================================
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

-- =====================================================
-- 7. Create view for points transaction summary
-- =====================================================
CREATE OR REPLACE VIEW loyalty_points_summary_view AS
SELECT
    user_id,
    SUM(CASE WHEN points_amount > 0 THEN points_amount ELSE 0 END) as total_earned,
    SUM(CASE WHEN points_amount < 0 THEN ABS(points_amount) ELSE 0 END) as total_redeemed,
    COUNT(*) as total_transactions,
    MAX(created_at) as last_transaction_date
FROM loyalty_points_transactions
GROUP BY user_id;

-- =====================================================
-- Success message
-- =====================================================
SELECT 'Loyalty & Rewards System migration completed successfully!' AS Status;
