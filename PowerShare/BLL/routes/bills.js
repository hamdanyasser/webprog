const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyGeneratorOwnership } = require('../middleware/ownershipValidation');

router.get('/my', authenticate, billController.getMyBills);
router.get('/my/pending', authenticate, billController.getPendingBills);

router.post('/', authenticate, authorize('owner', 'admin'), billController.createBill);
router.post('/generator/:generatorId/generate', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, billController.generateBills);
router.get('/generator/:generatorId', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, billController.getBillsByGenerator);
router.put('/:billId/status', authenticate, authorize('owner', 'admin'), billController.updateBillStatus);

module.exports = router;