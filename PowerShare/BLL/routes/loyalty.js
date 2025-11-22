const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { authenticate, authorize } = require('../middleware/auth');

// =====================================================
// USER ROUTES - Loyalty Points
// =====================================================

/**
 * @route   GET /api/loyalty/dashboard
 * @desc    Get user's complete loyalty dashboard
 * @access  Private
 */
router.get('/dashboard', authenticate, loyaltyController.getMyLoyaltyDashboard);

/**
 * @route   GET /api/loyalty/points
 * @desc    Get user's points balance
 * @access  Private
 */
router.get('/points', authenticate, loyaltyController.getMyPoints);

/**
 * @route   GET /api/loyalty/transactions
 * @desc    Get user's points transaction history
 * @access  Private
 */
router.get('/transactions', authenticate, loyaltyController.getMyTransactions);

/**
 * @route   POST /api/loyalty/redeem
 * @desc    Redeem points on a bill
 * @access  Private
 */
router.post('/redeem', authenticate, loyaltyController.redeemPoints);

// =====================================================
// USER ROUTES - Tiers
// =====================================================

/**
 * @route   GET /api/loyalty/tiers
 * @desc    Get all loyalty tiers
 * @access  Public
 */
router.get('/tiers', loyaltyController.getAllTiers);

/**
 * @route   GET /api/loyalty/my-tier
 * @desc    Get user's current tier
 * @access  Private
 */
router.get('/my-tier', authenticate, loyaltyController.getMyTier);

// =====================================================
// ADMIN ROUTES - Settings
// =====================================================

/**
 * @route   GET /api/loyalty/settings
 * @desc    Get all loyalty settings
 * @access  Admin only
 */
router.get('/settings', authenticate, authorize('admin'), loyaltyController.getSettings);

/**
 * @route   PUT /api/loyalty/settings
 * @desc    Update loyalty setting
 * @access  Admin only
 */
router.put('/settings', authenticate, authorize('admin'), loyaltyController.updateSetting);

/**
 * @route   POST /api/loyalty/award-points
 * @desc    Manually award points to a user
 * @access  Admin only
 */
router.post('/award-points', authenticate, authorize('admin'), loyaltyController.awardPoints);

// =====================================================
// ADMIN ROUTES - Statistics
// =====================================================

/**
 * @route   GET /api/loyalty/statistics
 * @desc    Get loyalty program statistics
 * @access  Admin only
 */
router.get('/statistics', authenticate, authorize('admin'), loyaltyController.getStatistics);

module.exports = router;
