const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate, authorize } = require('../middleware/auth');

// User wallet routes
router.get('/balance', authenticate, walletController.getBalance);
router.get('/summary', authenticate, walletController.getSummary);
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/transactions/export', authenticate, walletController.exportTransactions);
router.get('/statistics', authenticate, walletController.getStatistics);
router.get('/analytics', authenticate, walletController.getAnalytics);
router.get('/topup-methods', authenticate, walletController.getTopUpMethods);

// Wallet operations
router.post('/topup', authenticate, walletController.topUp);
router.post('/pay', authenticate, walletController.pay);
router.post('/transfer', authenticate, walletController.transfer);
router.put('/settings', authenticate, walletController.updateSettings);

// Admin only routes
router.post('/admin/refund', authenticate, authorize('admin'), walletController.processRefund);
router.post('/admin/bonus', authenticate, authorize('admin'), walletController.addBonus);
router.post('/admin/freeze', authenticate, authorize('admin'), walletController.freezeWallet);
router.post('/admin/unfreeze', authenticate, authorize('admin'), walletController.unfreezeWallet);

module.exports = router;
