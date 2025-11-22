const express = require('express');
const router = express.Router();
const pricingPlanDAL = require('../../DAL/pricingPlanDAL');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        const plans = await pricingPlanDAL.getAll();

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get pricing plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing plans'
        });
    }
});

router.get('/generator/:generatorId', async (req, res) => {
    try {
        const { generatorId } = req.params;
        const plans = await pricingPlanDAL.getPlansByGenerator(generatorId);

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get generator pricing plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing plans'
        });
    }
});

router.post('/', authenticate, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { generator_id, plan_name, amperage, monthly_price, description } = req.body;

        if (!generator_id || !plan_name || !amperage || !monthly_price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const planId = await pricingPlanDAL.createPlan({
            generator_id,
            plan_name,
            amperage,
            monthly_price,
            description
        });

        res.status(201).json({
            success: true,
            message: 'Pricing plan created successfully',
            data: { plan_id: planId }
        });
    } catch (error) {
        console.error('Create pricing plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create pricing plan'
        });
    }
});

router.put('/:planId', authenticate, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { planId } = req.params;
        const updates = req.body;

        await pricingPlanDAL.updatePlan(planId, updates);

        res.json({
            success: true,
            message: 'Pricing plan updated successfully'
        });
    } catch (error) {
        console.error('Update pricing plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update pricing plan'
        });
    }
});

router.delete('/:planId', authenticate, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { planId } = req.params;

        await pricingPlanDAL.deletePlan(planId);

        res.json({
            success: true,
            message: 'Pricing plan deleted successfully'
        });
    } catch (error) {
        console.error('Delete pricing plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete pricing plan'
        });
    }
});

module.exports = router;

