const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate, authorize } = require('../middleware/auth');
const {
    validateCurrency,
    walletTopUpValidation,
    validate,
    validateDateRange
} = require('../middleware/validator');

// User wallet routes
router.get('/balance', authenticate, validateCurrency, walletController.getBalance);
router.get('/summary', authenticate, walletController.getSummary);
router.get('/transactions', authenticate, validateCurrency, validateDateRange, walletController.getTransactions);
router.get('/transactions/export', authenticate, validateCurrency, validateDateRange, walletController.exportTransactions);
router.get('/statistics', authenticate, walletController.getStatistics);
router.get('/analytics', authenticate, walletController.getAnalytics);
router.get('/topup-methods', authenticate, walletController.getTopUpMethods);

// Wallet operations
router.post('/topup', authenticate, validateCurrency, walletTopUpValidation, validate, walletController.topUp);
router.post('/pay', authenticate, validateCurrency, walletController.pay);
router.post('/transfer', authenticate, validateCurrency, walletController.transfer);
router.put('/settings', authenticate, walletController.updateSettings);

// Admin only routes
router.post('/admin/refund', authenticate, authorize('admin'), validateCurrency, walletController.processRefund);
router.post('/admin/bonus', authenticate, authorize('admin'), validateCurrency, walletController.addBonus);
router.post('/admin/freeze', authenticate, authorize('admin'), walletController.freezeWallet);
router.post('/admin/unfreeze', authenticate, authorize('admin'), walletController.unfreezeWallet);

module.exports = router;
