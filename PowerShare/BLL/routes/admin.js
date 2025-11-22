const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
};

router.use(authenticate, isAdmin);

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/growth', adminController.getGrowthData);

router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.updateUserStatus);

router.get('/generators', adminController.getAllGenerators);
router.get('/generators/:genId', adminController.getGeneratorDetails);
router.patch('/generators/:genId/status', adminController.updateGeneratorStatus);

router.get('/payments', adminController.getAllPayments);
router.get('/payments/stats', adminController.getPaymentStats);

router.get('/reports/revenue', adminController.getRevenueReport);
router.get('/reports/user-growth', adminController.getUserGrowthReport);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;

