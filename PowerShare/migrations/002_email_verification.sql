-- =====================================================
-- Email Verification System Migration
-- =====================================================
-- Adds email verification functionality to prevent fake accounts

USE powershare_db2;

-- =====================================================
-- 1. Add email verification fields to users table
-- =====================================================
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email,
ADD COLUMN email_verification_token VARCHAR(255) DEFAULT NULL AFTER reset_token_expires,
ADD COLUMN email_verification_sent_at DATETIME DEFAULT NULL AFTER email_verification_token,
ADD INDEX idx_email_verified (email_verified),
ADD INDEX idx_verification_token (email_verification_token);

-- =====================================================
-- 2. Mark existing users as verified (grandfather clause)
-- =====================================================
UPDATE users SET email_verified = TRUE WHERE created_at < NOW();

-- =====================================================
-- Success message
-- =====================================================
SELECT 'Email Verification System migration completed successfully!' AS Status;
