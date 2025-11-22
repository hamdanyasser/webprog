const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyGeneratorOwnership } = require('../middleware/ownershipValidation');

router.post('/', authenticate, paymentController.createPayment);
router.get('/my', authenticate, paymentController.getMyPayments);

router.get('/all', authenticate, authorize('admin'), paymentController.getAllPayments);

router.get('/generator/:generatorId', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, paymentController.getPaymentsByGenerator);
router.get('/generator/:generatorId/stats', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, paymentController.getPaymentStats);

module.exports = router;