const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const billingAutomationController = require('../controllers/billingAutomationController');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyGeneratorOwnership } = require('../middleware/ownershipValidation');

// User bill routes
router.get('/my', authenticate, billController.getMyBills);
router.get('/my/pending', authenticate, billController.getPendingBills);

// Bill management routes (Owner/Admin)
router.post('/', authenticate, authorize('owner', 'admin'), billController.createBill);
router.post('/generator/:generatorId/generate', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, billController.generateBills);
router.get('/generator/:generatorId', authenticate, authorize('owner', 'admin'), verifyGeneratorOwnership, billController.getBillsByGenerator);
router.put('/:billId/status', authenticate, authorize('owner', 'admin'), billController.updateBillStatus);

// Billing automation routes (Admin only or Owner for their generators)
router.post('/automation/generate-monthly', authenticate, authorize('admin'), billingAutomationController.generateMonthlyBills);
router.post('/automation/generator/:generatorId/generate', authenticate, authorize('owner', 'admin'), billingAutomationController.generateBillsForGenerator);
router.get('/automation/statistics', authenticate, authorize('owner', 'admin'), billingAutomationController.getBillingStatistics);
router.get('/automation/settings', authenticate, authorize('admin'), billingAutomationController.getBillingSettings);

module.exports = router;