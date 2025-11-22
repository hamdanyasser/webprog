const db = require('./dbConnection');

class LoyaltyDAL {
    // =====================================================
    // LOYALTY POINTS TRANSACTIONS
    // =====================================================

    /**
     * Add points to a user's account
     */
    async addPoints(userId, points, type, referenceType, referenceId, description) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Insert transaction record
            const [result] = await connection.execute(
                `INSERT INTO loyalty_points_transactions
                 (user_id, points_amount, transaction_type, reference_type, reference_id, description)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, points, type, referenceType, referenceId, description]
            );

            // Update user's points balance
            await connection.execute(
                `UPDATE users
                 SET loyalty_points_balance = loyalty_points_balance + ?
                 WHERE user_id = ?`,
                [points, userId]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Redeem points from a user's account
     */
    async redeemPoints(userId, points, billId, description) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Check if user has enough points
            const [users] = await connection.execute(
                'SELECT loyalty_points_balance FROM users WHERE user_id = ?',
                [userId]
            );

            if (!users[0] || users[0].loyalty_points_balance < points) {
                throw new Error('Insufficient loyalty points');
            }

            // Insert transaction record (negative points)
            const [result] = await connection.execute(
                `INSERT INTO loyalty_points_transactions
                 (user_id, points_amount, transaction_type, reference_type, reference_id, description)
                 VALUES (?, ?, 'redeemed', 'bill', ?, ?)`,
                [userId, -points, billId, description]
            );

            // Update user's points balance
            await connection.execute(
                `UPDATE users
                 SET loyalty_points_balance = loyalty_points_balance - ?
                 WHERE user_id = ?`,
                [points, userId]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get user's points balance
     */
    async getUserPointsBalance(userId) {
        const [rows] = await db.execute(
            'SELECT loyalty_points_balance FROM users WHERE user_id = ?',
            [userId]
        );
        return rows[0]?.loyalty_points_balance || 0;
    }

    /**
     * Get user's points transaction history
     */
    async getUserTransactions(userId, limit = 50) {
        const [rows] = await db.execute(
            `SELECT
                transaction_id,
                points_amount,
                transaction_type,
                reference_type,
                reference_id,
                description,
                created_at
             FROM loyalty_points_transactions
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    /**
     * Get points summary for a user
     */
    async getUserPointsSummary(userId) {
        const [rows] = await db.execute(
            `SELECT
                user_id,
                COALESCE(SUM(CASE WHEN points_amount > 0 THEN points_amount ELSE 0 END), 0) as total_earned,
                COALESCE(SUM(CASE WHEN points_amount < 0 THEN ABS(points_amount) ELSE 0 END), 0) as total_redeemed,
                COUNT(*) as total_transactions,
                MAX(created_at) as last_transaction_date
             FROM loyalty_points_transactions
             WHERE user_id = ?
             GROUP BY user_id`,
            [userId]
        );
        return rows[0] || {
            user_id: userId,
            total_earned: 0,
            total_redeemed: 0,
            total_transactions: 0,
            last_transaction_date: null
        };
    }

    // =====================================================
    // LOYALTY TIERS
    // =====================================================

    /**
     * Get all loyalty tiers
     */
    async getAllTiers() {
        const [rows] = await db.execute(
            `SELECT * FROM loyalty_tiers ORDER BY min_points ASC`
        );
        return rows;
    }

    /**
     * Get user's current tier
     */
    async getUserTier(userId) {
        const [rows] = await db.execute(
            `SELECT
                u.user_id,
                u.full_name,
                u.loyalty_points_balance,
                lt.tier_id,
                lt.tier_name,
                lt.benefits_description,
                lt.discount_percentage as tier_discount_percentage,
                lt.min_points,
                lt.max_points
             FROM users u
             LEFT JOIN loyalty_tiers lt
                ON u.loyalty_points_balance >= lt.min_points
                AND (lt.max_points IS NULL OR u.loyalty_points_balance <= lt.max_points)
             WHERE u.user_id = ?
             LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    }

    /**
     * Get next tier for user (upgrade target)
     */
    async getNextTier(userId) {
        const [rows] = await db.execute(
            `SELECT
                u.loyalty_points_balance as current_points,
                lt.tier_id,
                lt.tier_name,
                lt.min_points,
                lt.benefits_description,
                lt.discount_percentage,
                (lt.min_points - u.loyalty_points_balance) as points_needed
             FROM users u
             CROSS JOIN loyalty_tiers lt
             WHERE u.user_id = ?
                AND lt.min_points > u.loyalty_points_balance
             ORDER BY lt.min_points ASC
             LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    }

    // =====================================================
    // PLATFORM SETTINGS
    // =====================================================

    /**
     * Get platform setting by key
     */
    async getSetting(settingKey) {
        const [rows] = await db.execute(
            'SELECT setting_value, setting_type FROM platform_settings WHERE setting_key = ?',
            [settingKey]
        );

        if (!rows[0]) return null;

        const { setting_value, setting_type } = rows[0];

        // Parse value based on type
        switch (setting_type) {
            case 'number':
                return parseFloat(setting_value);
            case 'boolean':
                return setting_value === 'true' || setting_value === '1';
            case 'json':
                return JSON.parse(setting_value);
            default:
                return setting_value;
        }
    }

    /**
     * Get all platform settings
     */
    async getAllSettings() {
        const [rows] = await db.execute(
            'SELECT setting_key, setting_value, setting_type, description FROM platform_settings'
        );

        const settings = {};
        rows.forEach(row => {
            const { setting_key, setting_value, setting_type } = row;
            switch (setting_type) {
                case 'number':
                    settings[setting_key] = parseFloat(setting_value);
                    break;
                case 'boolean':
                    settings[setting_key] = setting_value === 'true' || setting_value === '1';
                    break;
                case 'json':
                    settings[setting_key] = JSON.parse(setting_value);
                    break;
                default:
                    settings[setting_key] = setting_value;
            }
        });

        return settings;
    }

    /**
     * Update platform setting
     */
    async updateSetting(settingKey, settingValue) {
        const [result] = await db.execute(
            `UPDATE platform_settings
             SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
             WHERE setting_key = ?`,
            [String(settingValue), settingKey]
        );
        return result.affectedRows > 0;
    }

    /**
     * Get loyalty settings (convenience method)
     */
    async getLoyaltySettings() {
        const settings = await this.getAllSettings();
        return {
            pointsPerDollar: settings.loyalty_points_per_dollar || 1,
            pointsRedemptionValue: settings.points_redemption_value || 0.01,
            minPointsToRedeem: settings.min_points_to_redeem || 100,
            earlyPaymentDiscountEnabled: settings.early_payment_discount_enabled || false,
            earlyPaymentDiscountPercentage: settings.early_payment_discount_percentage || 2,
            earlyPaymentDaysThreshold: settings.early_payment_days_threshold || 5,
            latePaymentFeeEnabled: settings.late_payment_fee_enabled || false,
            latePaymentFeePercentage: settings.late_payment_fee_percentage || 5,
            latePaymentGracePeriodDays: settings.late_payment_grace_period_days || 3,
            maxPointsRedemptionPercentage: settings.max_points_redemption_percentage || 50
        };
    }

    // =====================================================
    // STATISTICS & ANALYTICS
    // =====================================================

    /**
     * Get top users by points
     */
    async getTopUsersByPoints(limit = 10) {
        const [rows] = await db.execute(
            `SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.loyalty_points_balance,
                lt.tier_name
             FROM users u
             LEFT JOIN loyalty_tiers lt
                ON u.loyalty_points_balance >= lt.min_points
                AND (lt.max_points IS NULL OR u.loyalty_points_balance <= lt.max_points)
             WHERE u.role IN ('household', 'owner')
             ORDER BY u.loyalty_points_balance DESC
             LIMIT ?`,
            [limit]
        );
        return rows;
    }

    /**
     * Get total points issued and redeemed
     */
    async getPointsStatistics() {
        const [rows] = await db.execute(
            `SELECT
                SUM(CASE WHEN points_amount > 0 THEN points_amount ELSE 0 END) as total_issued,
                SUM(CASE WHEN points_amount < 0 THEN ABS(points_amount) ELSE 0 END) as total_redeemed,
                COUNT(*) as total_transactions
             FROM loyalty_points_transactions`
        );
        return rows[0] || { total_issued: 0, total_redeemed: 0, total_transactions: 0 };
    }
}

module.exports = new LoyaltyDAL();
