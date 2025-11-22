const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyGeneratorOwnership } = require('../middleware/ownershipValidation');
const {
    paymentValidation,
    validate,
    validateDateRange
} = require('../middleware/validator');

router.post('/', authenticate, paymentValidation, validate, paymentController.createPayment);
router.get('/my', authenticate, paymentController.getMyPayments);

router.get('/all', authenticate, authorize('admin'), paymentController.getAllPayments);

router.get('/generator/:generatorId', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, paymentController.getPaymentsByGenerator);
router.get('/generator/:generatorId/stats', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, validateDateRange, paymentController.getPaymentStats);

module.exports = router;