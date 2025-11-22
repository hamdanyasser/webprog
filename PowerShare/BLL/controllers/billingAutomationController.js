const billingService = require('../services/billingService');

class BillingAutomationController {
    /**
     * Manually trigger monthly bill generation (Admin/Owner)
     */
    async generateMonthlyBills(req, res) {
        try {
            console.log('📋 Manual monthly bill generation triggered by user:', req.user.user_id);

            const result = await billingService.generateMonthlyBills();

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: {
                        generated: result.generated,
                        skipped: result.skipped,
                        errors: result.errors,
                        duration: result.duration
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error generating monthly bills:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate bills'
            });
        }
    }

    /**
     * Generate bills for a specific generator (Owner/Admin)
     */
    async generateBillsForGenerator(req, res) {
        try {
            const { generatorId } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role;

            // Verify ownership (unless admin)
            if (userRole !== 'admin') {
                const db = require('../../DAL/dbConnection');
                const [generators] = await db.execute(
                    'SELECT owner_id FROM generators WHERE generator_id = ?',
                    [generatorId]
                );

                if (!generators[0] || generators[0].owner_id !== userId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You do not own this generator.'
                    });
                }
            }

            console.log(`📋 Manual bill generation for generator ${generatorId} triggered by user:`, userId);

            const result = await billingService.generateBillsForGenerator(generatorId);

            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: {
                        generated: result.generated,
                        skipped: result.skipped,
                        errors: result.errors
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error generating bills for generator:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate bills'
            });
        }
    }

    /**
     * Get billing statistics (Admin/Owner)
     */
    async getBillingStatistics(req, res) {
        try {
            const stats = await billingService.getBillingStatistics();

            if (stats) {
                res.json({
                    success: true,
                    data: stats
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to get billing statistics'
                });
            }
        } catch (error) {
            console.error('Error getting billing statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics'
            });
        }
    }

    /**
     * Get billing automation settings (Admin)
     */
    async getBillingSettings(req, res) {
        try {
            const settings = await billingService.getBillingSettings();

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Error getting billing settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get billing settings'
            });
        }
    }
}

module.exports = new BillingAutomationController();
