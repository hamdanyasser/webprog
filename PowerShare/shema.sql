DROP DATABASE IF EXISTS powershare_db2;
CREATE DATABASE powershare_db2;
USE powershare_db2;

#Admin : admin@gmail.com
#Password : password123

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
                       email_notifications BOOLEAN DEFAULT TRUE,
                       sms_notifications BOOLEAN DEFAULT TRUE,
                       reminder_notifications BOOLEAN DEFAULT TRUE,
                       outage_alerts BOOLEAN DEFAULT TRUE,
                       theme ENUM('light', 'dark') DEFAULT 'light',
                       reset_token VARCHAR(255) DEFAULT NULL,
                       reset_token_expires DATETIME DEFAULT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       INDEX idx_email (email),
                       INDEX idx_role (role),
                       INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE generators (
                            generator_id INT AUTO_INCREMENT PRIMARY KEY,
                            owner_id INT NOT NULL,
                            generator_name VARCHAR(100) NOT NULL,
                            location VARCHAR(255) NOT NULL,
                            capacity_kw DECIMAL(10,2),
                            status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
                            INDEX idx_owner (owner_id),
                            INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE bills (
                       bill_id INT AUTO_INCREMENT PRIMARY KEY,
                       subscription_id INT NOT NULL,
                       amount DECIMAL(10,2) NOT NULL,
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

CREATE TABLE notifications (
                               notification_id INT AUTO_INCREMENT PRIMARY KEY,
                               user_id INT NOT NULL,
                               title VARCHAR(200) NOT NULL,
                               message TEXT NOT NULL,
                               type ENUM('outage', 'bill', 'payment', 'system') DEFAULT 'system',
                               is_read BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                               INDEX idx_user (user_id),
                               INDEX idx_read (is_read),
                               INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


INSERT INTO users (full_name, email, password_hash, phone, address, role) VALUES
    ('Admin User', 'admin@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111111', 'Beirut, Lebanon', 'admin'),
    ('Owner User', 'owner@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111112', 'Beirut, Lebanon', 'owner'),
    ('Household One', 'house1@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111113', 'Beirut, Lebanon', 'household'),
    ('Household Two', 'house2@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111114', 'Beirut, Lebanon', 'household'),
    ('Household Three', 'house3@gmail.com', '$2a$12$3RCBXMaggMkMblI7bBQacOIS8xRVlMmQaT5I8fJjNKiCqo/UwvAB.', '+96111111115', 'Beirut, Lebanon', 'household');
INSERT INTO generators (owner_id, generator_name, location, capacity_kw, status) VALUES
                                                                                     (2, 'Beirut Central Generator', 'Achrafieh, Beirut', 500.00, 'active'),
                                                                                     (2, 'Hamra Power Station', 'Hamra, Beirut', 300.00, 'active');

INSERT INTO pricing_plans (generator_id, plan_name, amperage, monthly_price, description) VALUES
                                                                                              (1, 'Basic 3A', 3, 45.00, 'Perfect for small apartments'),
                                                                                              (1, 'Standard 5A', 5, 75.00, 'Ideal for medium-sized homes'),
                                                                                              (1, 'Premium 10A', 10, 135.00, 'Best for large homes and businesses'),
                                                                                              (2, 'Basic 3A', 3, 40.00, 'Economy package'),
                                                                                              (2, 'Standard 5A', 5, 70.00, 'Standard package');

INSERT INTO subscriptions (user_id, generator_id, plan_id, start_date, status) VALUES
                                                                                   (1, 1, 2, '2025-01-01', 'active'),
                                                                                   (4, 1, 1, '2025-01-15', 'active'),
                                                                                   (5, 2, 4, '2025-02-01', 'active');

INSERT INTO bills (subscription_id, amount, billing_period_start, billing_period_end, due_date, status) VALUES
                                                                                                            (1, 75.00, '2025-01-01', '2025-01-31', '2025-02-05', 'paid'),
                                                                                                            (1, 75.00, '2025-02-01', '2025-02-28', '2025-03-05', 'pending'),
                                                                                                            (2, 45.00, '2025-01-15', '2025-02-14', '2025-02-20', 'paid'),
                                                                                                            (3, 40.00, '2025-02-01', '2025-02-28', '2025-03-05', 'pending');

INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) VALUES
                                                                                   (1, 75.00, 'card', 'TXN-2025-001', 'completed'),
                                                                                   (3, 45.00, 'cash', 'TXN-2025-002', 'completed');

INSERT INTO outage_schedules (generator_id, outage_date, start_time, end_time, notes) VALUES
                                                                                          (1, '2025-11-03', '06:00:00', '09:00:00', 'Morning maintenance'),
                                                                                          (1, '2025-11-03', '14:00:00', '17:00:00', 'Afternoon scheduled cut'),
                                                                                          (1, '2025-11-04', '10:00:00', '13:00:00', 'Midday outage'),
                                                                                          (2, '2025-11-03', '08:00:00', '11:00:00', 'Routine maintenance');

INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
                                                                       (1, 'Power Outage Alert', 'Scheduled outage today from 2:00 PM to 5:00 PM', 'outage', FALSE),
                                                                       (1, 'New Bill Available', 'Your February bill of $75.00 is now available', 'bill', FALSE),
                                                                       (4, 'Payment Successful', 'Your payment of $45.00 has been processed', 'payment', TRUE),
                                                                       (1, 'Welcome to PowerShare', 'Thank you for subscribing to our service', 'system', TRUE);


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

CREATE TABLE IF NOT EXISTS payment_methods (
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

INSERT INTO payment_methods (user_id, card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default) VALUES
(1, 'visa', '4242', 'Admin User', '12', '2026', TRUE),
(1, 'mastercard', '8888', 'Admin User', '09', '2027', FALSE);

SELECT 'Database created successfully!' AS Status;
SELECT 'Sample data inserted!' AS Status;
SELECT 'All tables, views, and preferences configured!' AS Status;