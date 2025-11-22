/**
 * Wallet Data Access Layer
 * Handles all database operations for wallets and transactions
 */

const db = require('./dbConnection');

class WalletDAL {
    /**
     * Get wallet by user ID
     * @param {number} userId - User ID
     * @returns {object} - Wallet data
     */
    async getWalletByUserId(userId) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM wallets WHERE user_id = ?`,
                [userId]
            );

            if (rows.length === 0) {
                // Create wallet if doesn't exist
                return await this.createWallet(userId);
            }

            return rows[0];
        } catch (error) {
            console.error('Error getting wallet:', error);
            throw error;
        }
    }

    /**
     * Create wallet for user
     * @param {number} userId - User ID
     * @param {string} defaultCurrency - Default currency (USD, LBP, EUR)
     * @returns {object} - Created wallet
     */
    async createWallet(userId, defaultCurrency = 'USD') {
        try {
            await db.execute(
                `INSERT INTO wallets (user_id, default_currency) VALUES (?, ?)`,
                [userId, defaultCurrency]
            );

            return await this.getWalletByUserId(userId);
        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }

    /**
     * Get wallet balance
     * @param {number} userId - User ID
     * @param {string} currency - Currency (USD, LBP, EUR)
     * @returns {number} - Balance amount
     */
    async getBalance(userId, currency = 'USD') {
        try {
            // Whitelist map for currency columns
            const currencyColumns = {
                'USD': 'balance_usd',
                'LBP': 'balance_lbp',
                'EUR': 'balance_eur'
            };

            const balanceKey = currencyColumns[currency.toUpperCase()];

            if (!balanceKey) {
                throw new Error(`Unsupported currency: ${currency}`);
            }

            const wallet = await this.getWalletByUserId(userId);
            return parseFloat(wallet[balanceKey] || 0);
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Update wallet balance
     * @param {number} walletId - Wallet ID
     * @param {string} currency - Currency
     * @param {number} newBalance - New balance amount
     */
    async updateBalance(walletId, currency, newBalance) {
        try {
            // Whitelist map for currency columns (prevents SQL injection)
            const currencyColumns = {
                'USD': 'balance_usd',
                'LBP': 'balance_lbp',
                'EUR': 'balance_eur'
            };

            const balanceColumn = currencyColumns[currency.toUpperCase()];

            if (!balanceColumn) {
                throw new Error(`Unsupported currency: ${currency}`);
            }

            await db.execute(
                `UPDATE wallets SET ${balanceColumn} = ?, updated_at = NOW() WHERE wallet_id = ?`,
                [newBalance, walletId]
            );
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
    }

    /**
     * Create wallet transaction
     * @param {object} transactionData - Transaction details
     * @returns {object} - Created transaction
     */
    async createTransaction(transactionData) {
        try {
            const {
                wallet_id,
                user_id,
                type,
                amount,
                currency = 'USD',
                balance_before,
                balance_after,
                status = 'pending',
                reference_type = null,
                reference_id = null,
                description,
                admin_notes = null,
                payment_method = null,
                payment_reference = null,
                related_user_id = null,
                metadata = null
            } = transactionData;

            const [result] = await db.execute(
                `INSERT INTO wallet_transactions
                 (wallet_id, user_id, type, amount, currency, balance_before, balance_after,
                  status, reference_type, reference_id, description, admin_notes,
                  payment_method, payment_reference, related_user_id, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    wallet_id, user_id, type, amount, currency, balance_before, balance_after,
                    status, reference_type, reference_id, description, admin_notes,
                    payment_method, payment_reference, related_user_id,
                    metadata ? JSON.stringify(metadata) : null
                ]
            );

            const [transaction] = await db.execute(
                `SELECT * FROM wallet_transactions WHERE transaction_id = ?`,
                [result.insertId]
            );

            return transaction[0];
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    /**
     * Complete a pending transaction
     * @param {number} transactionId - Transaction ID
     */
    async completeTransaction(transactionId) {
        try {
            await db.execute(
                `UPDATE wallet_transactions
                 SET status = 'completed', completed_at = NOW()
                 WHERE transaction_id = ?`,
                [transactionId]
            );
        } catch (error) {
            console.error('Error completing transaction:', error);
            throw error;
        }
    }

    /**
     * Get transactions by wallet ID
     * @param {number} walletId - Wallet ID
     * @param {number} limit - Limit
     * @param {number} offset - Offset
     * @returns {Array} - Transactions
     */
    async getTransactionsByWalletId(walletId, limit = 50, offset = 0) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM wallet_transactions
                 WHERE wallet_id = ?
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [walletId, parseInt(limit), parseInt(offset)]
            );

            return rows;
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    /**
     * Get transactions by user ID with filters
     * @param {number} userId - User ID
     * @param {object} filters - Filter options
     * @returns {object} - Transactions and pagination
     */
    async getTransactionsByUserId(userId, filters = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                type = null,
                status = null,
                currency = null,
                dateFrom = null,
                dateTo = null
            } = filters;

            const offset = (page - 1) * limit;

            // Build WHERE clause
            let whereConditions = ['user_id = ?'];
            let params = [userId];

            if (type) {
                whereConditions.push('type = ?');
                params.push(type);
            }

            if (status) {
                whereConditions.push('status = ?');
                params.push(status);
            }

            if (currency) {
                whereConditions.push('currency = ?');
                params.push(currency);
            }

            if (dateFrom) {
                whereConditions.push('created_at >= ?');
                params.push(dateFrom);
            }

            if (dateTo) {
                whereConditions.push('created_at <= ?');
                params.push(dateTo);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const [countResult] = await db.execute(
                `SELECT COUNT(*) as total FROM wallet_transactions WHERE ${whereClause}`,
                params
            );
            const total = countResult[0].total;

            // Get transactions
            const [transactions] = await db.execute(
                `SELECT * FROM wallet_transactions
                 WHERE ${whereClause}
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );

            return {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    /**
     * Get transaction statistics
     * @param {number} userId - User ID
     * @returns {object} - Statistics
     */
    async getTransactionStatistics(userId) {
        try {
            const [stats] = await db.execute(
                `SELECT
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN type = 'topup' AND status = 'completed' THEN amount ELSE 0 END) as total_topups,
                    SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END) as total_payments,
                    SUM(CASE WHEN type = 'refund' AND status = 'completed' THEN amount ELSE 0 END) as total_refunds,
                    SUM(CASE WHEN type IN ('cashback', 'bonus') AND status = 'completed' THEN amount ELSE 0 END) as total_rewards
                 FROM wallet_transactions
                 WHERE user_id = ?`,
                [userId]
            );

            const [recentActivity] = await db.execute(
                `SELECT
                    DATE(created_at) as date,
                    COUNT(*) as count,
                    SUM(CASE WHEN type = 'topup' THEN amount ELSE 0 END) as topup_amount,
                    SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as payment_amount
                 FROM wallet_transactions
                 WHERE user_id = ?
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date DESC`,
                [userId]
            );

            return {
                overall: stats[0],
                recentActivity
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw error;
        }
    }

    /**
     * Get all top-up methods
     * @returns {Array} - Top-up methods
     */
    async getTopUpMethods() {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM wallet_top_up_methods
                 WHERE is_active = TRUE
                 ORDER BY display_order ASC`
            );

            return rows.map(row => ({
                ...row,
                supported_currencies: JSON.parse(row.supported_currencies || '[]')
            }));
        } catch (error) {
            console.error('Error getting top-up methods:', error);
            throw error;
        }
    }

    /**
     * Update wallet status
     * @param {number} walletId - Wallet ID
     * @param {string} status - Status (active, frozen, suspended)
     */
    async updateWalletStatus(walletId, status) {
        try {
            await db.execute(
                `UPDATE wallets SET status = ?, updated_at = NOW() WHERE wallet_id = ?`,
                [status, walletId]
            );
        } catch (error) {
            console.error('Error updating wallet status:', error);
            throw error;
        }
    }

    /**
     * Update low balance alert timestamp
     * @param {number} walletId - Wallet ID
     */
    async updateLowBalanceAlert(walletId) {
        try {
            await db.execute(
                `UPDATE wallets SET last_low_balance_alert_at = NOW() WHERE wallet_id = ?`,
                [walletId]
            );
        } catch (error) {
            console.error('Error updating low balance alert:', error);
            throw error;
        }
    }

    /**
     * Get wallets with low balance
     * @returns {Array} - Wallets with low balance
     */
    async getLowBalanceWallets() {
        try {
            const [rows] = await db.execute(
                `SELECT
                    w.wallet_id,
                    w.user_id,
                    u.full_name,
                    u.email,
                    w.balance_usd,
                    w.low_balance_threshold
                 FROM wallets w
                 JOIN users u ON w.user_id = u.user_id
                 WHERE w.status = 'active'
                 AND w.low_balance_alerts_enabled = TRUE
                 AND w.balance_usd < w.low_balance_threshold
                 AND (
                     w.last_low_balance_alert_at IS NULL
                     OR w.last_low_balance_alert_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 )`
            );

            return rows;
        } catch (error) {
            console.error('Error getting low balance wallets:', error);
            throw error;
        }
    }

    /**
     * Update wallet settings
     * @param {number} userId - User ID
     * @param {object} settings - Wallet settings
     */
    async updateWalletSettings(userId, settings) {
        try {
            const {
                default_currency,
                low_balance_threshold,
                low_balance_alerts_enabled,
                auto_topup_enabled,
                auto_topup_threshold,
                auto_topup_amount
            } = settings;

            const updates = [];
            const params = [];

            if (default_currency !== undefined) {
                updates.push('default_currency = ?');
                params.push(default_currency);
            }
            if (low_balance_threshold !== undefined) {
                updates.push('low_balance_threshold = ?');
                params.push(low_balance_threshold);
            }
            if (low_balance_alerts_enabled !== undefined) {
                updates.push('low_balance_alerts_enabled = ?');
                params.push(low_balance_alerts_enabled);
            }
            if (auto_topup_enabled !== undefined) {
                updates.push('auto_topup_enabled = ?');
                params.push(auto_topup_enabled);
            }
            if (auto_topup_threshold !== undefined) {
                updates.push('auto_topup_threshold = ?');
                params.push(auto_topup_threshold);
            }
            if (auto_topup_amount !== undefined) {
                updates.push('auto_topup_amount = ?');
                params.push(auto_topup_amount);
            }

            if (updates.length === 0) {
                throw new Error('No settings to update');
            }

            updates.push('updated_at = NOW()');
            params.push(userId);

            await db.execute(
                `UPDATE wallets SET ${updates.join(', ')} WHERE user_id = ?`,
                params
            );

            return await this.getWalletByUserId(userId);
        } catch (error) {
            console.error('Error updating wallet settings:', error);
            throw error;
        }
    }
}

module.exports = new WalletDAL();
