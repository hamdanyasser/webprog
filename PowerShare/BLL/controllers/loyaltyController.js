const loyaltyDAL = require('../../DAL/loyaltyDAL');
const billDAL = require('../../DAL/billDAL');

class LoyaltyController {
    // =====================================================
    // POINTS MANAGEMENT
    // =====================================================

    /**
     * Get user's loyalty points dashboard
     */
    async getMyLoyaltyDashboard(req, res) {
        try {
            const userId = req.user.user_id;

            // Get points balance
            const balance = await loyaltyDAL.getUserPointsBalance(userId);

            // Get current tier
            const currentTier = await loyaltyDAL.getUserTier(userId);

            // Get next tier
            const nextTier = await loyaltyDAL.getNextTier(userId);

            // Get points summary
            const summary = await loyaltyDAL.getUserPointsSummary(userId);

            // Get recent transactions
            const recentTransactions = await loyaltyDAL.getUserTransactions(userId, 10);

            // Get loyalty settings
            const settings = await loyaltyDAL.getLoyaltySettings();

            res.json({
                success: true,
                data: {
                    balance,
                    currentTier: currentTier || {
                        tier_name: 'Bronze',
                        tier_discount_percentage: 0,
                        benefits_description: 'Entry level'
                    },
                    nextTier,
                    summary,
                    recentTransactions,
                    settings: {
                        pointsPerDollar: settings.pointsPerDollar,
                        pointsRedemptionValue: settings.pointsRedemptionValue,
                        minPointsToRedeem: settings.minPointsToRedeem
                    }
                }
            });
        } catch (error) {
            console.error('Get loyalty dashboard error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load loyalty dashboard'
            });
        }
    }

    /**
     * Get user's points balance
     */
    async getMyPoints(req, res) {
        try {
            const userId = req.user.user_id;
            const balance = await loyaltyDAL.getUserPointsBalance(userId);

            res.json({
                success: true,
                data: { balance }
            });
        } catch (error) {
            console.error('Get points error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get points balance'
            });
        }
    }

    /**
     * Get user's points transaction history
     */
    async getMyTransactions(req, res) {
        try {
            const userId = req.user.user_id;
            const limit = parseInt(req.query.limit) || 50;

            const transactions = await loyaltyDAL.getUserTransactions(userId, limit);

            res.json({
                success: true,
                data: { transactions }
            });
        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction history'
            });
        }
    }

    /**
     * Redeem points on a bill
     */
    async redeemPoints(req, res) {
        try {
            const userId = req.user.user_id;
            const { bill_id, points_to_redeem } = req.body;

            // Validation
            if (!bill_id || !points_to_redeem) {
                return res.status(400).json({
                    success: false,
                    message: 'Bill ID and points to redeem are required'
                });
            }

            if (points_to_redeem <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Points to redeem must be positive'
                });
            }

            // Get loyalty settings
            const settings = await loyaltyDAL.getLoyaltySettings();

            // Check minimum points
            if (points_to_redeem < settings.minPointsToRedeem) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum ${settings.minPointsToRedeem} points required to redeem`
                });
            }

            // Check user's balance
            const balance = await loyaltyDAL.getUserPointsBalance(userId);
            if (balance < points_to_redeem) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient points balance'
                });
            }

            // Get bill details
            const bill = await billDAL.findById(bill_id);
            if (!bill) {
                return res.status(404).json({
                    success: false,
                    message: 'Bill not found'
                });
            }

            // Verify bill belongs to user
            if (bill.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access to this bill'
                });
            }

            // Check bill status
            if (bill.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Can only redeem points on pending bills'
                });
            }

            // Calculate discount amount
            const discountAmount = points_to_redeem * settings.pointsRedemptionValue;

            // Check max redemption percentage
            const maxDiscount = bill.amount * (settings.maxPointsRedemptionPercentage / 100);
            if (discountAmount > maxDiscount) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot redeem more than ${settings.maxPointsRedemptionPercentage}% of bill amount`
                });
            }

            // Redeem points
            await loyaltyDAL.redeemPoints(
                userId,
                points_to_redeem,
                bill_id,
                `Redeemed ${points_to_redeem} points on bill #${bill_id}`
            );

            // Update bill with points discount
            await billDAL.updateBillPointsDiscount(bill_id, points_to_redeem, discountAmount);

            res.json({
                success: true,
                message: 'Points redeemed successfully',
                data: {
                    points_redeemed: points_to_redeem,
                    discount_amount: discountAmount,
                    new_balance: balance - points_to_redeem
                }
            });
        } catch (error) {
            console.error('Redeem points error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to redeem points'
            });
        }
    }

    // =====================================================
    // TIERS
    // =====================================================

    /**
     * Get all loyalty tiers
     */
    async getAllTiers(req, res) {
        try {
            const tiers = await loyaltyDAL.getAllTiers();

            res.json({
                success: true,
                data: { tiers }
            });
        } catch (error) {
            console.error('Get tiers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get loyalty tiers'
            });
        }
    }

    /**
     * Get user's current tier
     */
    async getMyTier(req, res) {
        try {
            const userId = req.user.user_id;
            const tier = await loyaltyDAL.getUserTier(userId);

            res.json({
                success: true,
                data: { tier }
            });
        } catch (error) {
            console.error('Get tier error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user tier'
            });
        }
    }

    // =====================================================
    // ADMIN - SETTINGS
    // =====================================================

    /**
     * Get all loyalty settings (Admin only)
     */
    async getSettings(req, res) {
        try {
            const settings = await loyaltyDAL.getAllSettings();

            res.json({
                success: true,
                data: { settings }
            });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get settings'
            });
        }
    }

    /**
     * Update loyalty setting (Admin only)
     */
    async updateSetting(req, res) {
        try {
            const { setting_key, setting_value } = req.body;

            if (!setting_key || setting_value === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Setting key and value are required'
                });
            }

            const updated = await loyaltyDAL.updateSetting(setting_key, setting_value);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Setting not found'
                });
            }

            res.json({
                success: true,
                message: 'Setting updated successfully'
            });
        } catch (error) {
            console.error('Update setting error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update setting'
            });
        }
    }

    /**
     * Manually award points to user (Admin only)
     */
    async awardPoints(req, res) {
        try {
            const { user_id, points, description } = req.body;

            if (!user_id || !points) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and points are required'
                });
            }

            if (points <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Points must be positive'
                });
            }

            await loyaltyDAL.addPoints(
                user_id,
                points,
                'bonus',
                'manual',
                null,
                description || 'Manual points awarded by admin'
            );

            res.json({
                success: true,
                message: 'Points awarded successfully'
            });
        } catch (error) {
            console.error('Award points error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to award points'
            });
        }
    }

    // =====================================================
    // ADMIN - STATISTICS
    // =====================================================

    /**
     * Get loyalty program statistics (Admin only)
     */
    async getStatistics(req, res) {
        try {
            const stats = await loyaltyDAL.getPointsStatistics();
            const topUsers = await loyaltyDAL.getTopUsersByPoints(10);

            res.json({
                success: true,
                data: {
                    statistics: stats,
                    topUsers
                }
            });
        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics'
            });
        }
    }
}

module.exports = new LoyaltyController();
