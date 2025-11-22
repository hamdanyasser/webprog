const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../DAL/dbConnection');

class TwoFactorService {
    /**
     * Generate a 6-digit OTP code
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generate backup codes for account recovery
     * @returns {Array} Array of 10 backup codes
     */
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            // Generate 8-character alphanumeric code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    /**
     * Hash backup codes for storage
     * @param {Array} codes - Plain text backup codes
     * @returns {Array} Hashed backup codes
     */
    async hashBackupCodes(codes) {
        const hashedCodes = [];
        for (const code of codes) {
            const hash = await bcrypt.hash(code, 10);
            hashedCodes.push(hash);
        }
        return hashedCodes;
    }

    /**
     * Create and store a 2FA code for user
     * @param {number} userId - User ID
     * @returns {string} The generated OTP code
     */
    async createTwoFactorCode(userId) {
        const connection = await db.getConnection();

        try {
            // Generate 6-digit OTP
            const code = this.generateOTP();
            const codeHash = await bcrypt.hash(code, 10);

            // Set expiration to 10 minutes from now
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            // Invalidate any existing unused codes for this user
            await connection.query(
                'UPDATE two_factor_codes SET verified = TRUE WHERE user_id = ? AND verified = FALSE',
                [userId]
            );

            // Insert new code
            await connection.query(
                `INSERT INTO two_factor_codes (user_id, code, code_hash, expires_at)
                 VALUES (?, ?, ?, ?)`,
                [userId, code, codeHash, expiresAt]
            );

            return code;
        } finally {
            connection.release();
        }
    }

    /**
     * Verify a 2FA code
     * @param {number} userId - User ID
     * @param {string} code - Code to verify
     * @returns {boolean} True if code is valid
     */
    async verifyTwoFactorCode(userId, code) {
        const connection = await db.getConnection();

        try {
            // Get the latest unverified code for this user
            const [codes] = await connection.query(
                `SELECT code_id, code_hash, expires_at, attempts
                 FROM two_factor_codes
                 WHERE user_id = ? AND verified = FALSE AND expires_at > NOW()
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [userId]
            );

            if (codes.length === 0) {
                return false;
            }

            const codeData = codes[0];

            // Check if too many attempts (max 5)
            if (codeData.attempts >= 5) {
                return false;
            }

            // Verify code
            const isValid = await bcrypt.compare(code, codeData.code_hash);

            if (isValid) {
                // Mark code as verified
                await connection.query(
                    'UPDATE two_factor_codes SET verified = TRUE WHERE code_id = ?',
                    [codeData.code_id]
                );
                return true;
            } else {
                // Increment attempts
                await connection.query(
                    'UPDATE two_factor_codes SET attempts = attempts + 1 WHERE code_id = ?',
                    [codeData.code_id]
                );
                return false;
            }
        } finally {
            connection.release();
        }
    }

    /**
     * Verify a backup code
     * @param {number} userId - User ID
     * @param {string} code - Backup code to verify
     * @returns {boolean} True if backup code is valid
     */
    async verifyBackupCode(userId, code) {
        const connection = await db.getConnection();

        try {
            // Get user's backup codes
            const [users] = await connection.query(
                'SELECT backup_codes FROM users WHERE user_id = ?',
                [userId]
            );

            if (users.length === 0 || !users[0].backup_codes) {
                return false;
            }

            const backupCodes = JSON.parse(users[0].backup_codes);

            // Check each backup code
            for (let i = 0; i < backupCodes.length; i++) {
                const isValid = await bcrypt.compare(code, backupCodes[i]);

                if (isValid) {
                    // Remove used backup code
                    backupCodes.splice(i, 1);

                    // Update user's backup codes
                    await connection.query(
                        'UPDATE users SET backup_codes = ? WHERE user_id = ?',
                        [JSON.stringify(backupCodes), userId]
                    );

                    return true;
                }
            }

            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Enable 2FA for a user
     * @param {number} userId - User ID
     * @returns {Array} Array of backup codes (plain text, show only once)
     */
    async enableTwoFactor(userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Generate backup codes
            const backupCodes = this.generateBackupCodes();
            const hashedCodes = await this.hashBackupCodes(backupCodes);

            // Enable 2FA and store hashed backup codes
            await connection.query(
                'UPDATE users SET two_factor_enabled = TRUE, backup_codes = ? WHERE user_id = ?',
                [JSON.stringify(hashedCodes), userId]
            );

            await connection.commit();

            // Return plain text backup codes (only shown once!)
            return backupCodes;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Disable 2FA for a user
     * @param {number} userId - User ID
     */
    async disableTwoFactor(userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Disable 2FA and clear backup codes
            await connection.query(
                'UPDATE users SET two_factor_enabled = FALSE, backup_codes = NULL WHERE user_id = ?',
                [userId]
            );

            // Clear all 2FA codes
            await connection.query(
                'DELETE FROM two_factor_codes WHERE user_id = ?',
                [userId]
            );

            // Clear all trusted devices
            await connection.query(
                'DELETE FROM trusted_devices WHERE user_id = ?',
                [userId]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Create a trusted device token
     * @param {number} userId - User ID
     * @param {string} deviceName - Device name/browser
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent string
     * @returns {string} Device token
     */
    async createTrustedDevice(userId, deviceName, ipAddress, userAgent) {
        const connection = await db.getConnection();

        try {
            // Generate unique device token
            const deviceToken = crypto.randomBytes(32).toString('hex');

            // Set expiration to 30 days from now
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await connection.query(
                `INSERT INTO trusted_devices (user_id, device_token, device_name, ip_address, user_agent, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, deviceToken, deviceName, ipAddress, userAgent, expiresAt]
            );

            return deviceToken;
        } finally {
            connection.release();
        }
    }

    /**
     * Verify if device is trusted
     * @param {number} userId - User ID
     * @param {string} deviceToken - Device token from cookie
     * @returns {boolean} True if device is trusted
     */
    async verifyTrustedDevice(userId, deviceToken) {
        if (!deviceToken) return false;

        const connection = await db.getConnection();

        try {
            const [devices] = await connection.query(
                `SELECT device_id FROM trusted_devices
                 WHERE user_id = ? AND device_token = ? AND expires_at > NOW()
                 LIMIT 1`,
                [userId, deviceToken]
            );

            if (devices.length > 0) {
                // Update last used timestamp
                await connection.query(
                    'UPDATE trusted_devices SET last_used_at = NOW() WHERE device_id = ?',
                    [devices[0].device_id]
                );
                return true;
            }

            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Get trusted devices for a user
     * @param {number} userId - User ID
     * @returns {Array} Array of trusted devices
     */
    async getTrustedDevices(userId) {
        const connection = await db.getConnection();

        try {
            const [devices] = await connection.query(
                `SELECT device_id, device_name, ip_address, created_at, last_used_at, expires_at
                 FROM trusted_devices
                 WHERE user_id = ? AND expires_at > NOW()
                 ORDER BY last_used_at DESC`,
                [userId]
            );

            return devices;
        } finally {
            connection.release();
        }
    }

    /**
     * Remove a trusted device
     * @param {number} userId - User ID
     * @param {number} deviceId - Device ID to remove
     */
    async removeTrustedDevice(userId, deviceId) {
        const connection = await db.getConnection();

        try {
            await connection.query(
                'DELETE FROM trusted_devices WHERE device_id = ? AND user_id = ?',
                [deviceId, userId]
            );
        } finally {
            connection.release();
        }
    }

    /**
     * Check if user has 2FA enabled
     * @param {number} userId - User ID
     * @returns {boolean} True if 2FA is enabled
     */
    async isTwoFactorEnabled(userId) {
        const connection = await db.getConnection();

        try {
            const [users] = await connection.query(
                'SELECT two_factor_enabled FROM users WHERE user_id = ?',
                [userId]
            );

            return users.length > 0 && users[0].two_factor_enabled === 1;
        } finally {
            connection.release();
        }
    }

    /**
     * Get remaining backup codes count
     * @param {number} userId - User ID
     * @returns {number} Number of remaining backup codes
     */
    async getRemainingBackupCodesCount(userId) {
        const connection = await db.getConnection();

        try {
            const [users] = await connection.query(
                'SELECT backup_codes FROM users WHERE user_id = ?',
                [userId]
            );

            if (users.length === 0 || !users[0].backup_codes) {
                return 0;
            }

            const backupCodes = JSON.parse(users[0].backup_codes);
            return backupCodes.length;
        } finally {
            connection.release();
        }
    }
}

module.exports = new TwoFactorService();
