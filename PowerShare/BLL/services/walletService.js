/**
 * Wallet Service
 * Handles business logic for wallet operations
 */

const walletDAL = require('../../DAL/walletDAL');
const db = require('../../DAL/dbConnection');
const realtimeNotificationService = require('./realtimeNotificationService');

class WalletService {
    /**
     * Get wallet balance for user
     * @param {number} userId - User ID
     * @param {string} currency - Currency code
     * @returns {object} - Wallet and balance info
     */
    async getWalletBalance(userId, currency = 'USD') {
        try {
            const wallet = await walletDAL.getWalletByUserId(userId);
            const balance = await walletDAL.getBalance(userId, currency);

            return {
                wallet_id: wallet.wallet_id,
                balance,
                currency,
                default_currency: wallet.default_currency,
                status: wallet.status,
                balances: {
                    usd: parseFloat(wallet.balance_usd),
                    lbp: parseFloat(wallet.balance_lbp),
                    eur: parseFloat(wallet.balance_eur)
                }
            };
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            throw error;
        }
    }

    /**
     * Top up wallet balance
     * @param {number} userId - User ID
     * @param {number} amount - Amount to top up
     * @param {string} currency - Currency
     * @param {string} paymentMethod - Payment method (credit_card, bank_transfer, etc.)
     * @param {string} paymentReference - Payment reference/transaction ID
     * @param {object} metadata - Additional metadata
     * @returns {object} - Transaction details
     */
    async topUpWallet(userId, amount, currency = 'USD', paymentMethod, paymentReference, metadata = {}) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Validate amount
            if (amount <= 0) {
                throw new Error('Top-up amount must be greater than zero');
            }

            // Get wallet
            const wallet = await walletDAL.getWalletByUserId(userId);

            if (wallet.status !== 'active') {
                throw new Error('Wallet is not active. Please contact support.');
            }

            // Get current balance
            const balanceBefore = await walletDAL.getBalance(userId, currency);
            const balanceAfter = balanceBefore + amount;

            // Update wallet balance
            await walletDAL.updateBalance(wallet.wallet_id, currency, balanceAfter);

            // Create transaction record
            const transaction = await walletDAL.createTransaction({
                wallet_id: wallet.wallet_id,
                user_id: userId,
                type: 'topup',
                amount,
                currency,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'completed',
                description: `Wallet top-up via ${paymentMethod}`,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                metadata
            });

            await connection.commit();

            // Send notification
            await realtimeNotificationService.sendNotification({
                userId,
                title: '💰 Wallet Top-Up Successful',
                message: `Your wallet has been topped up with ${amount} ${currency}.`,
                type: 'payment',
                actionUrl: '/wallet/transactions',
                icon: '💰'
            });

            return {
                success: true,
                transaction,
                balance: balanceAfter,
                currency
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error topping up wallet:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Pay from wallet (deduct balance)
     * @param {number} userId - User ID
     * @param {number} amount - Amount to deduct
     * @param {string} currency - Currency
     * @param {string} referenceType - Reference type (bill, subscription, etc.)
     * @param {number} referenceId - Reference ID
     * @param {string} description - Payment description
     * @returns {object} - Transaction details
     */
    async payFromWallet(userId, amount, currency = 'USD', referenceType, referenceId, description) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Validate amount
            if (amount <= 0) {
                throw new Error('Payment amount must be greater than zero');
            }

            // Get wallet
            const wallet = await walletDAL.getWalletByUserId(userId);

            if (wallet.status !== 'active') {
                throw new Error('Wallet is not active. Please contact support.');
            }

            // Get current balance
            const balanceBefore = await walletDAL.getBalance(userId, currency);

            // Check sufficient balance
            if (balanceBefore < amount) {
                throw new Error(`Insufficient balance. Current balance: ${balanceBefore} ${currency}`);
            }

            const balanceAfter = balanceBefore - amount;

            // Update wallet balance
            await walletDAL.updateBalance(wallet.wallet_id, currency, balanceAfter);

            // Create transaction record
            const transaction = await walletDAL.createTransaction({
                wallet_id: wallet.wallet_id,
                user_id: userId,
                type: 'payment',
                amount,
                currency,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'completed',
                reference_type: referenceType,
                reference_id: referenceId,
                description
            });

            await connection.commit();

            // Check for low balance and trigger alert
            await this.checkLowBalance(userId, wallet.wallet_id, balanceAfter, currency);

            // Send notification
            await realtimeNotificationService.sendNotification({
                userId,
                title: '✅ Payment Successful',
                message: `Payment of ${amount} ${currency} completed. ${description}`,
                type: 'payment',
                actionUrl: '/wallet/transactions',
                icon: '✅'
            });

            return {
                success: true,
                transaction,
                balance: balanceAfter,
                currency
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error processing wallet payment:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Transfer between wallets
     * @param {number} fromUserId - Sender user ID
     * @param {number} toUserId - Receiver user ID
     * @param {number} amount - Amount to transfer
     * @param {string} currency - Currency
     * @param {string} note - Transfer note
     * @returns {object} - Transfer details
     */
    async transferBetweenWallets(fromUserId, toUserId, amount, currency = 'USD', note = '') {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Validate amount
            if (amount <= 0) {
                throw new Error('Transfer amount must be greater than zero');
            }

            // Cannot transfer to self
            if (fromUserId === toUserId) {
                throw new Error('Cannot transfer to yourself');
            }

            // Get sender wallet
            const fromWallet = await walletDAL.getWalletByUserId(fromUserId);
            if (fromWallet.status !== 'active') {
                throw new Error('Your wallet is not active');
            }

            // Get receiver wallet
            const toWallet = await walletDAL.getWalletByUserId(toUserId);
            if (toWallet.status !== 'active') {
                throw new Error('Receiver wallet is not active');
            }

            // Get sender balance
            const fromBalanceBefore = await walletDAL.getBalance(fromUserId, currency);

            // Check sufficient balance
            if (fromBalanceBefore < amount) {
                throw new Error(`Insufficient balance. Current balance: ${fromBalanceBefore} ${currency}`);
            }

            // Get receiver balance
            const toBalanceBefore = await walletDAL.getBalance(toUserId, currency);

            // Calculate new balances
            const fromBalanceAfter = fromBalanceBefore - amount;
            const toBalanceAfter = toBalanceBefore + amount;

            // Update sender balance
            await walletDAL.updateBalance(fromWallet.wallet_id, currency, fromBalanceAfter);

            // Update receiver balance
            await walletDAL.updateBalance(toWallet.wallet_id, currency, toBalanceAfter);

            // Create transfer record
            const [transferResult] = await connection.execute(
                `INSERT INTO wallet_transfers
                 (from_wallet_id, to_wallet_id, from_user_id, to_user_id, amount, currency, note, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
                [fromWallet.wallet_id, toWallet.wallet_id, fromUserId, toUserId, amount, currency, note]
            );

            const transferId = transferResult.insertId;

            // Create outgoing transaction for sender
            const outTransaction = await walletDAL.createTransaction({
                wallet_id: fromWallet.wallet_id,
                user_id: fromUserId,
                type: 'transfer_out',
                amount,
                currency,
                balance_before: fromBalanceBefore,
                balance_after: fromBalanceAfter,
                status: 'completed',
                reference_type: 'transfer',
                reference_id: transferId,
                description: `Transfer to user #${toUserId}${note ? ': ' + note : ''}`,
                related_user_id: toUserId
            });

            // Create incoming transaction for receiver
            const inTransaction = await walletDAL.createTransaction({
                wallet_id: toWallet.wallet_id,
                user_id: toUserId,
                type: 'transfer_in',
                amount,
                currency,
                balance_before: toBalanceBefore,
                balance_after: toBalanceAfter,
                status: 'completed',
                reference_type: 'transfer',
                reference_id: transferId,
                description: `Transfer from user #${fromUserId}${note ? ': ' + note : ''}`,
                related_user_id: fromUserId
            });

            // Link transactions to transfer
            await connection.execute(
                `UPDATE wallet_transfers
                 SET from_transaction_id = ?, to_transaction_id = ?
                 WHERE transfer_id = ?`,
                [outTransaction.transaction_id, inTransaction.transaction_id, transferId]
            );

            await connection.commit();

            // Send notifications
            await realtimeNotificationService.sendNotification({
                userId: fromUserId,
                title: '💸 Transfer Sent',
                message: `You sent ${amount} ${currency} to user #${toUserId}`,
                type: 'payment',
                actionUrl: '/wallet/transactions',
                icon: '💸'
            });

            await realtimeNotificationService.sendNotification({
                userId: toUserId,
                title: '💰 Money Received',
                message: `You received ${amount} ${currency} from user #${fromUserId}`,
                type: 'payment',
                actionUrl: '/wallet/transactions',
                icon: '💰'
            });

            return {
                success: true,
                transfer_id: transferId,
                from_balance: fromBalanceAfter,
                to_balance: toBalanceAfter,
                amount,
                currency
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error transferring between wallets:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Process refund to wallet
     * @param {number} userId - User ID
     * @param {number} amount - Refund amount
     * @param {string} currency - Currency
     * @param {string} referenceType - Reference type
     * @param {number} referenceId - Reference ID
     * @param {string} reason - Refund reason
     * @returns {object} - Transaction details
     */
    async processRefund(userId, amount, currency = 'USD', referenceType, referenceId, reason) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Validate amount
            if (amount <= 0) {
                throw new Error('Refund amount must be greater than zero');
            }

            // Get wallet
            const wallet = await walletDAL.getWalletByUserId(userId);

            // Get current balance
            const balanceBefore = await walletDAL.getBalance(userId, currency);
            const balanceAfter = balanceBefore + amount;

            // Update wallet balance
            await walletDAL.updateBalance(wallet.wallet_id, currency, balanceAfter);

            // Create transaction record
            const transaction = await walletDAL.createTransaction({
                wallet_id: wallet.wallet_id,
                user_id: userId,
                type: 'refund',
                amount,
                currency,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'completed',
                reference_type: referenceType,
                reference_id: referenceId,
                description: `Refund: ${reason}`
            });

            await connection.commit();

            // Send notification
            await realtimeNotificationService.sendNotification({
                userId,
                title: '💵 Refund Processed',
                message: `A refund of ${amount} ${currency} has been added to your wallet.`,
                type: 'payment',
                actionUrl: '/wallet/transactions',
                icon: '💵'
            });

            return {
                success: true,
                transaction,
                balance: balanceAfter,
                currency
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error processing refund:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Add bonus/reward to wallet
     * @param {number} userId - User ID
     * @param {number} amount - Bonus amount
     * @param {string} currency - Currency
     * @param {string} type - Bonus type (bonus, cashback, points_conversion)
     * @param {string} description - Description
     * @param {object} metadata - Additional metadata
     * @returns {object} - Transaction details
     */
    async addBonus(userId, amount, currency = 'USD', type = 'bonus', description, metadata = {}) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Validate amount
            if (amount <= 0) {
                throw new Error('Bonus amount must be greater than zero');
            }

            // Get wallet
            const wallet = await walletDAL.getWalletByUserId(userId);

            // Get current balance
            const balanceBefore = await walletDAL.getBalance(userId, currency);
            const balanceAfter = balanceBefore + amount;

            // Update wallet balance
            await walletDAL.updateBalance(wallet.wallet_id, currency, balanceAfter);

            // Create transaction record
            const transaction = await walletDAL.createTransaction({
                wallet_id: wallet.wallet_id,
                user_id: userId,
                type,
                amount,
                currency,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'completed',
                description,
                metadata
            });

            await connection.commit();

            // Send notification
            const icons = {
                bonus: '🎁',
                cashback: '💸',
                points_conversion: '⭐'
            };

            await realtimeNotificationService.sendNotification({
                userId,
                title: `${icons[type] || '🎁'} Bonus Added`,
                message: `${amount} ${currency} has been added to your wallet. ${description}`,
                type: 'loyalty',
                actionUrl: '/wallet',
                icon: icons[type] || '🎁'
            });

            return {
                success: true,
                transaction,
                balance: balanceAfter,
                currency
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error adding bonus:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Check low balance and trigger alerts/auto-topup
     * @param {number} userId - User ID
     * @param {number} walletId - Wallet ID
     * @param {number} currentBalance - Current balance
     * @param {string} currency - Currency
     */
    async checkLowBalance(userId, walletId, currentBalance, currency = 'USD') {
        try {
            const wallet = await walletDAL.getWalletByUserId(userId);

            // Check if balance is below threshold
            if (currentBalance < wallet.low_balance_threshold) {
                // Check auto top-up
                if (wallet.auto_topup_enabled && currentBalance < wallet.auto_topup_threshold) {
                    console.log(`Auto top-up triggered for user ${userId}`);
                    // Here you would integrate with payment gateway
                    // For now, just log the intent

                    await realtimeNotificationService.sendNotification({
                        userId,
                        title: '⚡ Auto Top-Up Required',
                        message: `Your balance is low (${currentBalance} ${currency}). Auto top-up of ${wallet.auto_topup_amount} ${currency} is pending.`,
                        type: 'alert',
                        actionUrl: '/wallet/topup',
                        icon: '⚡'
                    });
                } else {
                    // Send low balance alert
                    await walletDAL.updateLowBalanceAlert(walletId);

                    await realtimeNotificationService.sendNotification({
                        userId,
                        title: '⚠️ Low Wallet Balance',
                        message: `Your wallet balance is low (${currentBalance} ${currency}). Please top up to avoid payment issues.`,
                        type: 'alert',
                        actionUrl: '/wallet/topup',
                        icon: '⚠️'
                    });
                }
            }
        } catch (error) {
            console.error('Error checking low balance:', error);
            // Don't throw error here to avoid disrupting main transaction
        }
    }

    /**
     * Get transaction history with filters
     * @param {number} userId - User ID
     * @param {object} filters - Filter options
     * @returns {object} - Transactions and pagination
     */
    async getTransactionHistory(userId, filters = {}) {
        try {
            return await walletDAL.getTransactionsByUserId(userId, filters);
        } catch (error) {
            console.error('Error getting transaction history:', error);
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
            return await walletDAL.getTransactionStatistics(userId);
        } catch (error) {
            console.error('Error getting transaction statistics:', error);
            throw error;
        }
    }

    /**
     * Get available top-up methods
     * @returns {Array} - Top-up methods
     */
    async getTopUpMethods() {
        try {
            return await walletDAL.getTopUpMethods();
        } catch (error) {
            console.error('Error getting top-up methods:', error);
            throw error;
        }
    }

    /**
     * Update wallet settings
     * @param {number} userId - User ID
     * @param {object} settings - Settings to update
     * @returns {object} - Updated wallet
     */
    async updateWalletSettings(userId, settings) {
        try {
            // Validate settings
            if (settings.low_balance_threshold !== undefined && settings.low_balance_threshold < 0) {
                throw new Error('Low balance threshold cannot be negative');
            }

            if (settings.auto_topup_threshold !== undefined && settings.auto_topup_threshold < 0) {
                throw new Error('Auto top-up threshold cannot be negative');
            }

            if (settings.auto_topup_amount !== undefined && settings.auto_topup_amount <= 0) {
                throw new Error('Auto top-up amount must be greater than zero');
            }

            const updatedWallet = await walletDAL.updateWalletSettings(userId, settings);

            // Send notification
            await realtimeNotificationService.sendNotification({
                userId,
                title: '⚙️ Wallet Settings Updated',
                message: 'Your wallet settings have been updated successfully.',
                type: 'system',
                actionUrl: '/wallet/settings',
                icon: '⚙️'
            });

            return updatedWallet;
        } catch (error) {
            console.error('Error updating wallet settings:', error);
            throw error;
        }
    }

    /**
     * Freeze wallet (admin function)
     * @param {number} walletId - Wallet ID
     * @param {string} reason - Reason for freezing
     */
    async freezeWallet(walletId, reason) {
        try {
            await walletDAL.updateWalletStatus(walletId, 'frozen');

            // Get wallet to notify user
            const [wallets] = await db.execute(
                'SELECT user_id FROM wallets WHERE wallet_id = ?',
                [walletId]
            );

            if (wallets.length > 0) {
                await realtimeNotificationService.sendNotification({
                    userId: wallets[0].user_id,
                    title: '🔒 Wallet Frozen',
                    message: `Your wallet has been frozen. Reason: ${reason}`,
                    type: 'alert',
                    actionUrl: '/support',
                    icon: '🔒'
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error freezing wallet:', error);
            throw error;
        }
    }

    /**
     * Unfreeze wallet (admin function)
     * @param {number} walletId - Wallet ID
     */
    async unfreezeWallet(walletId) {
        try {
            await walletDAL.updateWalletStatus(walletId, 'active');

            // Get wallet to notify user
            const [wallets] = await db.execute(
                'SELECT user_id FROM wallets WHERE wallet_id = ?',
                [walletId]
            );

            if (wallets.length > 0) {
                await realtimeNotificationService.sendNotification({
                    userId: wallets[0].user_id,
                    title: '✅ Wallet Activated',
                    message: 'Your wallet has been activated. You can now use your wallet.',
                    type: 'system',
                    actionUrl: '/wallet',
                    icon: '✅'
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error unfreezing wallet:', error);
            throw error;
        }
    }

    /**
     * Get wallet summary for user
     * @param {number} userId - User ID
     * @returns {object} - Wallet summary
     */
    async getWalletSummary(userId) {
        try {
            const [summary] = await db.execute(
                'SELECT * FROM wallet_summary WHERE user_id = ?',
                [userId]
            );

            if (summary.length === 0) {
                // Create wallet if doesn't exist
                await walletDAL.getWalletByUserId(userId);
                return await this.getWalletSummary(userId);
            }

            return summary[0];
        } catch (error) {
            console.error('Error getting wallet summary:', error);
            throw error;
        }
    }

    /**
     * Get analytics data for charts
     * @param {number} userId - User ID
     * @param {number} period - Period in days (7, 30, 90, 365)
     * @returns {object} - Analytics data
     */
    async getAnalytics(userId, period = 30) {
        try {
            const wallet = await walletDAL.getWalletByUserId(userId);

            // Get transactions for period
            const [transactions] = await db.execute(
                `SELECT
                    DATE(created_at) as date,
                    type,
                    SUM(amount) as total_amount,
                    COUNT(*) as count
                 FROM wallet_transactions
                 WHERE user_id = ?
                 AND status = 'completed'
                 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at), type
                 ORDER BY date ASC`,
                [userId, period]
            );

            // Get spending by category (transaction type)
            const [spendingByType] = await db.execute(
                `SELECT
                    type,
                    SUM(amount) as total,
                    COUNT(*) as count,
                    currency
                 FROM wallet_transactions
                 WHERE user_id = ?
                 AND status = 'completed'
                 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY type, currency
                 ORDER BY total DESC`,
                [userId, period]
            );

            // Get daily balance trend
            const [balanceTrend] = await db.execute(
                `SELECT
                    DATE(created_at) as date,
                    balance_after as balance,
                    currency
                 FROM wallet_transactions
                 WHERE user_id = ?
                 AND status = 'completed'
                 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 AND currency = ?
                 ORDER BY created_at ASC`,
                [userId, period, wallet.default_currency]
            );

            // Get monthly comparison
            const [monthlyComparison] = await db.execute(
                `SELECT
                    MONTH(created_at) as month,
                    YEAR(created_at) as year,
                    type,
                    SUM(amount) as total
                 FROM wallet_transactions
                 WHERE user_id = ?
                 AND status = 'completed'
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                 GROUP BY YEAR(created_at), MONTH(created_at), type
                 ORDER BY year DESC, month DESC`,
                [userId]
            );

            // Get top spending days
            const [topSpendingDays] = await db.execute(
                `SELECT
                    DATE(created_at) as date,
                    SUM(CASE WHEN type IN ('payment', 'transfer_out') THEN amount ELSE 0 END) as spending
                 FROM wallet_transactions
                 WHERE user_id = ?
                 AND status = 'completed'
                 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY spending DESC
                 LIMIT 5`,
                [userId, period]
            );

            // Format data for charts
            return {
                period,
                wallet: {
                    balance_usd: parseFloat(wallet.balance_usd),
                    balance_lbp: parseFloat(wallet.balance_lbp),
                    balance_eur: parseFloat(wallet.balance_eur),
                    default_currency: wallet.default_currency
                },
                dailyTransactions: transactions,
                spendingByType: spendingByType.map(row => ({
                    ...row,
                    total: parseFloat(row.total)
                })),
                balanceTrend: balanceTrend.map(row => ({
                    ...row,
                    balance: parseFloat(row.balance)
                })),
                monthlyComparison: monthlyComparison.map(row => ({
                    ...row,
                    total: parseFloat(row.total)
                })),
                topSpendingDays: topSpendingDays.map(row => ({
                    ...row,
                    spending: parseFloat(row.spending)
                }))
            };
        } catch (error) {
            console.error('Error getting analytics:', error);
            throw error;
        }
    }
}

module.exports = new WalletService();
