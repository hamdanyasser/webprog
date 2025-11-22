const express = require('express');
const router = express.Router();
const capacityService = require('../services/capacityService');
const { authenticate, authorize } = require('../middleware/auth');

// Get capacity for a specific generator
router.get('/generator/:generatorId', authenticate, async (req, res) => {
    try {
        const { generatorId } = req.params;
        const capacity = await capacityService.getGeneratorCapacity(generatorId);

        if (!capacity) {
            return res.status(404).json({
                success: false,
                message: 'Generator not found'
            });
        }

        res.json({
            success: true,
            data: capacity
        });
    } catch (error) {
        console.error('Get capacity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch capacity information'
        });
    }
});

// Get capacity alerts for owner
router.get('/alerts', authenticate, authorize('owner', 'admin'), async (req, res) => {
    try {
        const ownerId = req.user.user_id;
        const alerts = await capacityService.getCapacityAlerts(ownerId);

        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        console.error('Get capacity alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch capacity alerts'
        });
    }
});

// Get capacity statistics for owner
router.get('/stats', authenticate, authorize('owner', 'admin'), async (req, res) => {
    try {
        const ownerId = req.user.user_id;
        const stats = await capacityService.getOwnerCapacityStats(ownerId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get capacity stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch capacity statistics'
        });
    }
});

// Get all generators with capacity (admin only)
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
    try {
        const capacities = await capacityService.getAllGeneratorsCapacity();

        res.json({
            success: true,
            data: capacities
        });
    } catch (error) {
        console.error('Get all capacities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch capacity data'
        });
    }
});

module.exports = router;
