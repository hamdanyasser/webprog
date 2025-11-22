const express = require('express');
const router = express.Router();
const generatorController = require('../controllers/generatorController');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyGeneratorOwnership } = require('../middleware/ownershipValidation');

router.get('/', generatorController.getAllGenerators);
router.get('/:generatorId', generatorController.getGeneratorById);

router.post('/', authenticate, authorize('owner'), generatorController.createGenerator);
router.get('/my/generators', authenticate, authorize('owner'), generatorController.getMyGenerators);

router.put('/:generatorId', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, generatorController.updateGenerator);
router.delete('/:generatorId', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, generatorController.deleteGenerator);
router.get('/:generatorId/stats', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, generatorController.getGeneratorStats);

module.exports = router;