const generatorDAL = require('../../DAL/generatorDAL');

async function verifyGeneratorOwnership(req, res, next) {
    try {
        const { generatorId } = req.params;
        const userId = req.user.user_id;
        const userRole = req.user.role;

        if (userRole === 'admin') {
            return next();
        }

        if (!generatorId) {
            return res.status(400).json({
                success: false,
                message: 'Generator ID is required'
            });
        }

        const generator = await generatorDAL.findById(generatorId);

        if (!generator) {
            return res.status(404).json({
                success: false,
                message: 'Generator not found'
            });
        }

        if (generator.owner_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not own this generator.'
            });
        }

        next();
    } catch (error) {
        console.error('Ownership validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify generator ownership'
        });
    }
}


async function verifyOwnerHasGenerator(req, res, next) {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;

        if (userRole === 'admin') {
            return next();
        }

        const generators = await generatorDAL.getByOwnerId(userId);

        if (!generators || generators.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No generator found for this owner. Please create a generator first.'
            });
        }

        req.ownerGeneratorId = generators[0].generator_id;
        next();
    } catch (error) {
        console.error('Owner generator check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify generator ownership'
        });
    }
}

module.exports = {
    verifyGeneratorOwnership,
    verifyOwnerHasGenerator
};
