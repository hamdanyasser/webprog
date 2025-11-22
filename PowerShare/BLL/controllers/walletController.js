/**
 * Wallet Controller
 * Handles HTTP requests for wallet operations
 */

const walletService = require('../services/walletService');

class WalletController {
    /**
     * Get wallet balance
     */
    async getBalance(req, res) {
        try {
            const userId = req.user.user_id;
            const { currency = 'USD' } = req.query;

            const walletInfo = await walletService.getWalletBalance(userId, currency);

            res.json({
                success: true,
                data: walletInfo
            });
        } catch (error) {
            console.error('Get balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch wallet balance'
            });
        }
    }

    /**
     * Get wallet summary
     */
    async getSummary(req, res) {
        try {
            const userId = req.user.user_id;

            const summary = await walletService.getWalletSummary(userId);

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('Get summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch wallet summary'
            });
        }
    }

    /**
     * Top up wallet
     */
    async topUp(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                amount,
                currency = 'USD',
                paymentMethod,
                paymentReference,
                metadata = {}
            } = req.body;

            // Validate input
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid top-up amount'
                });
            }

            if (!paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment method is required'
                });
            }

            const result = await walletService.topUpWallet(
                userId,
                parseFloat(amount),
                currency,
                paymentMethod,
                paymentReference,
                metadata
            );

            res.json({
                success: true,
                message: 'Wallet topped up successfully',
                data: result
            });
        } catch (error) {
            console.error('Top-up error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to top up wallet'
            });
        }
    }

    /**
     * Pay from wallet
     */
    async pay(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                amount,
                currency = 'USD',
                referenceType,
                referenceId,
                description
            } = req.body;

            // Validate input
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment amount'
                });
            }

            if (!description) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment description is required'
                });
            }

            const result = await walletService.payFromWallet(
                userId,
                parseFloat(amount),
                currency,
                referenceType,
                referenceId,
                description
            );

            res.json({
                success: true,
                message: 'Payment successful',
                data: result
            });
        } catch (error) {
            console.error('Payment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process payment'
            });
        }
    }

    /**
     * Transfer to another wallet
     */
    async transfer(req, res) {
        try {
            const fromUserId = req.user.user_id;
            const {
                toUserId,
                amount,
                currency = 'USD',
                note = ''
            } = req.body;

            // Validate input
            if (!toUserId) {
                return res.status(400).json({
                    success: false,
                    message: 'Receiver user ID is required'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transfer amount'
                });
            }

            const result = await walletService.transferBetweenWallets(
                fromUserId,
                parseInt(toUserId),
                parseFloat(amount),
                currency,
                note
            );

            res.json({
                success: true,
                message: 'Transfer completed successfully',
                data: result
            });
        } catch (error) {
            console.error('Transfer error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process transfer'
            });
        }
    }

    /**
     * Get transaction history
     */
    async getTransactions(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                page = 1,
                limit = 20,
                type,
                status,
                currency,
                dateFrom,
                dateTo
            } = req.query;

            const result = await walletService.getTransactionHistory(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                type,
                status,
                currency,
                dateFrom,
                dateTo
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions'
            });
        }
    }

    /**
     * Get transaction statistics
     */
    async getStatistics(req, res) {
        try {
            const userId = req.user.user_id;

            const statistics = await walletService.getTransactionStatistics(userId);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics'
            });
        }
    }

    /**
     * Get top-up methods
     */
    async getTopUpMethods(req, res) {
        try {
            const methods = await walletService.getTopUpMethods();

            res.json({
                success: true,
                data: methods
            });
        } catch (error) {
            console.error('Get top-up methods error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch top-up methods'
            });
        }
    }

    /**
     * Update wallet settings
     */
    async updateSettings(req, res) {
        try {
            const userId = req.user.user_id;
            const settings = req.body;

            const updatedWallet = await walletService.updateWalletSettings(userId, settings);

            res.json({
                success: true,
                message: 'Wallet settings updated successfully',
                data: updatedWallet
            });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update wallet settings'
            });
        }
    }

    /**
     * Process refund (Admin only)
     */
    async processRefund(req, res) {
        try {
            const {
                userId,
                amount,
                currency = 'USD',
                referenceType,
                referenceId,
                reason
            } = req.body;

            // Validate input
            if (!userId || !amount || !reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const result = await walletService.processRefund(
                parseInt(userId),
                parseFloat(amount),
                currency,
                referenceType,
                referenceId,
                reason
            );

            res.json({
                success: true,
                message: 'Refund processed successfully',
                data: result
            });
        } catch (error) {
            console.error('Refund error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to process refund'
            });
        }
    }

    /**
     * Add bonus (Admin only)
     */
    async addBonus(req, res) {
        try {
            const {
                userId,
                amount,
                currency = 'USD',
                type = 'bonus',
                description,
                metadata = {}
            } = req.body;

            // Validate input
            if (!userId || !amount || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const result = await walletService.addBonus(
                parseInt(userId),
                parseFloat(amount),
                currency,
                type,
                description,
                metadata
            );

            res.json({
                success: true,
                message: 'Bonus added successfully',
                data: result
            });
        } catch (error) {
            console.error('Add bonus error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to add bonus'
            });
        }
    }

    /**
     * Freeze wallet (Admin only)
     */
    async freezeWallet(req, res) {
        try {
            const { walletId, reason } = req.body;

            if (!walletId || !reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet ID and reason are required'
                });
            }

            await walletService.freezeWallet(parseInt(walletId), reason);

            res.json({
                success: true,
                message: 'Wallet frozen successfully'
            });
        } catch (error) {
            console.error('Freeze wallet error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to freeze wallet'
            });
        }
    }

    /**
     * Unfreeze wallet (Admin only)
     */
    async unfreezeWallet(req, res) {
        try {
            const { walletId } = req.body;

            if (!walletId) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet ID is required'
                });
            }

            await walletService.unfreezeWallet(parseInt(walletId));

            res.json({
                success: true,
                message: 'Wallet unfrozen successfully'
            });
        } catch (error) {
            console.error('Unfreeze wallet error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to unfreeze wallet'
            });
        }
    }

    /**
     * Export transactions to CSV
     */
    async exportTransactions(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                type,
                status,
                currency,
                dateFrom,
                dateTo
            } = req.query;

            // Get all transactions with filters
            const result = await walletService.getTransactionHistory(userId, {
                page: 1,
                limit: 10000, // Get all
                type,
                status,
                currency,
                dateFrom,
                dateTo
            });

            const transactions = result.transactions;

            // Convert to CSV
            const csvHeaders = ['ID', 'Date', 'Type', 'Amount', 'Currency', 'Balance Before', 'Balance After', 'Status', 'Description'];
            const csvRows = transactions.map(t => [
                t.transaction_id,
                new Date(t.created_at).toISOString(),
                t.type,
                t.amount,
                t.currency,
                t.balance_before,
                t.balance_after,
                t.status,
                `"${(t.description || '').replace(/"/g, '""')}"`
            ]);

            const csv = [
                csvHeaders.join(','),
                ...csvRows.map(row => row.join(','))
            ].join('\n');

            // Set headers for file download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="wallet_transactions_${Date.now()}.csv"`);
            res.send(csv);
        } catch (error) {
            console.error('Export transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export transactions'
            });
        }
    }
}

module.exports = new WalletController();
