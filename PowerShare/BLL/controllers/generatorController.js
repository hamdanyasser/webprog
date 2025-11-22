const generatorDAL = require('../../DAL/generatorDAL');
const pricingPlanDAL = require('../../DAL/pricingPlanDAL');
const capacityService = require('../services/capacityService');

class GeneratorController {
    async createGenerator(req, res) {
        try {
            const { generator_name, location, capacity_kw } = req.body;
            const owner_id = req.user.user_id;

            const generatorId = await generatorDAL.createGenerator({
                owner_id,
                generator_name,
                location,
                capacity_kw
            });

            res.status(201).json({
                success: true,
                message: 'Generator created successfully',
                data: { generatorId }
            });
        } catch (error) {
            console.error('Create generator error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create generator'
            });
        }
    }

    async getAllGenerators(req, res) {
        try {
            const generators = await generatorDAL.getAllGenerators();

            // Add capacity information to each generator
            const generatorsWithCapacity = await Promise.all(
                generators.map(async (generator) => {
                    const capacity = await capacityService.getGeneratorCapacity(generator.generator_id);
                    return {
                        ...generator,
                        capacity: capacity ? {
                            maxAmperage: capacity.maxAmperage,
                            usedAmperage: capacity.usedAmperage,
                            availableAmperage: capacity.availableAmperage,
                            capacityPercentage: capacity.capacityPercentage,
                            activeSubscribers: capacity.activeSubscribers,
                            status: capacity.status,
                            canAcceptNew: capacity.canAcceptNew
                        } : null
                    };
                })
            );

            res.json({
                success: true,
                data: generatorsWithCapacity
            });
        } catch (error) {
            console.error('Get generators error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch generators'
            });
        }
    }

    async getGeneratorById(req, res) {
        try {
            const { generatorId } = req.params;
            const generator = await generatorDAL.findById(generatorId);

            if (!generator) {
                return res.status(404).json({
                    success: false,
                    message: 'Generator not found'
                });
            }

            // Add capacity information
            const capacity = await capacityService.getGeneratorCapacity(generatorId);
            const generatorWithCapacity = {
                ...generator,
                capacity: capacity ? {
                    maxAmperage: capacity.maxAmperage,
                    usedAmperage: capacity.usedAmperage,
                    availableAmperage: capacity.availableAmperage,
                    capacityPercentage: capacity.capacityPercentage,
                    activeSubscribers: capacity.activeSubscribers,
                    status: capacity.status,
                    canAcceptNew: capacity.canAcceptNew
                } : null
            };

            res.json({
                success: true,
                data: generatorWithCapacity
            });
        } catch (error) {
            console.error('Get generator error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch generator'
            });
        }
    }

    async getMyGenerators(req, res) {
        try {
            const ownerId = req.user.user_id;
            const generators = await generatorDAL.getByOwnerId(ownerId);

            res.json({
                success: true,
                data: generators
            });
        } catch (error) {
            console.error('Get my generators error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch generators'
            });
        }
    }

    async updateGenerator(req, res) {
        try {
            const { generatorId } = req.params;
            const updates = req.body;

            await generatorDAL.updateGenerator(generatorId, updates);

            res.json({
                success: true,
                message: 'Generator updated successfully'
            });
        } catch (error) {
            console.error('Update generator error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update generator'
            });
        }
    }

    async deleteGenerator(req, res) {
        try {
            const { generatorId } = req.params;

            await generatorDAL.deleteGenerator(generatorId);

            res.json({
                success: true,
                message: 'Generator deleted successfully'
            });
        } catch (error) {
            console.error('Delete generator error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete generator'
            });
        }
    }

    async getGeneratorStats(req, res) {
        try {
            const { generatorId } = req.params;
            const stats = await generatorDAL.getGeneratorStats(generatorId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics'
            });
        }
    }
}

module.exports = new GeneratorController();