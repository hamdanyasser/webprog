const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const { authenticate } = require('../middleware/auth');

router.get('/my', authenticate, paymentMethodController.getMyPaymentMethods);
router.post('/', authenticate, paymentMethodController.addPaymentMethod);
router.put('/:paymentMethodId', authenticate, paymentMethodController.updatePaymentMethod);
router.put('/:paymentMethodId/default', authenticate, paymentMethodController.setDefaultPaymentMethod);
router.delete('/:paymentMethodId', authenticate, paymentMethodController.deletePaymentMethod);

module.exports = router;

