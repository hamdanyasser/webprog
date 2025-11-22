-- =====================================================
-- Automated Billing System Migration
-- =====================================================
-- Adds automated billing configuration and scheduling

USE powershare_db2;

-- =====================================================
-- 1. Add automated billing settings to platform_settings
-- =====================================================

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
('automated_billing_enabled', 'true', 'boolean', 'Enable automated monthly bill generation'),
('billing_day_of_month', '1', 'number', 'Day of month to generate bills (1-28)'),
('payment_due_days', '7', 'number', 'Days after billing period end that payment is due'),
('send_bill_email_notifications', 'true', 'boolean', 'Send email notifications when bills are generated'),
('send_bill_sms_notifications', 'false', 'boolean', 'Send SMS notifications when bills are generated'),
('billing_reminder_days_before', '3', 'number', 'Days before due date to send payment reminders'),
('overdue_check_enabled', 'true', 'boolean', 'Enable automatic overdue bill checking')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- =====================================================
-- Success message
-- =====================================================
SELECT 'Automated Billing System migration completed successfully!' AS Status;
