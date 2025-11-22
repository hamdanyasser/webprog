const db = require('./dbConnection');
const bcrypt = require('bcryptjs');

class UserDAL {
    async createUser(userData) {
        const { full_name, email, password, phone, address, role, profile_image } = userData;

        if (!password) {
            throw new Error('Password is undefined in createUser()');
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users (full_name, email, password_hash, phone, address, role, profile_image) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, password_hash, phone, address, role || 'household', profile_image || null]
        );

        return result.insertId;
    }

    async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    async findById(userId) {
        const [rows] = await db.execute(
            'SELECT user_id, full_name, email, phone, address, role, profile_image, created_at FROM users WHERE user_id = ?',
            [userId]
        );
        return rows[0];
    }

    async updateUser(userId, updates) {
        const { full_name, phone, address, profile_image } = updates;
        
        if (profile_image !== undefined) {
            await db.execute(
                'UPDATE users SET full_name = ?, phone = ?, address = ?, profile_image = ? WHERE user_id = ?',
                [full_name, phone, address, profile_image, userId]
            );
        } else {
            await db.execute(
                'UPDATE users SET full_name = ?, phone = ?, address = ? WHERE user_id = ?',
                [full_name, phone, address, userId]
            );
        }
    }

    async getAllUsers() {
        const [rows] = await db.execute(
            'SELECT user_id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
        );
        return rows;
    }

    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    async updatePassword(userId, newPassword) {
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [hashed, userId]
        );
    }

    async getUserPreferences(userId) {
        const [rows] = await db.execute(
            'SELECT email_notifications, outage_alerts, sms_notifications, theme FROM users WHERE user_id = ?',
            [userId]
        );
        return rows[0];
    }

    async updateUserPreferences(userId, preferences) {
        const { email_notifications, outage_alerts, sms_notifications, theme } = preferences;

        await db.execute(
            'UPDATE users SET email_notifications = ?, outage_alerts = ?, sms_notifications = ?, theme = ? WHERE user_id = ?',
            [email_notifications, outage_alerts, sms_notifications, theme, userId]
        );
    }

    async setEmailVerificationToken(userId, token) {
        await db.execute(
            'UPDATE users SET email_verification_token = ?, email_verification_sent_at = NOW() WHERE user_id = ?',
            [token, userId]
        );
    }

    async findByVerificationToken(token) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email_verification_token = ?',
            [token]
        );
        return rows[0];
    }

    async verifyEmail(userId) {
        await db.execute(
            'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_sent_at = NULL WHERE user_id = ?',
            [userId]
        );
    }

    async isEmailVerified(email) {
        const [rows] = await db.execute(
            'SELECT email_verified FROM users WHERE email = ?',
            [email]
        );
        return rows[0]?.email_verified || false;
    }
}

module.exports = new UserDAL();
