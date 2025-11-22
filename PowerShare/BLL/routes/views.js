const express = require('express');
const router = express.Router();
const { authenticate, authenticateView, authorize } = require('../middleware/auth');

router.get('/', (req, res) => {
    res.render('index', { title: 'PowerShare - Home' });
});

router.get('/login', (req, res) => {
    res.render('login', { title: 'Login - PowerShare' });
});

router.get('/register', (req, res) => {
    res.render('register', { title: 'Register - PowerShare' });
});

router.get('/verify-email', (req, res) => {
    res.render('verify-email', { title: 'Verify Email - PowerShare' });
});

router.get('/resend-verification', (req, res) => {
    res.render('resend-verification', { title: 'Resend Verification - PowerShare' });
});

router.get('/dashboard', authenticateView, (req, res) => {
    const role = req.user.role;

    if (role === 'admin') {
        res.render('admin-dashboard', {
            title: 'Admin Dashboard',
            user: req.user
        });
    } else if (role === 'owner') {
        res.render('owner-dashboard', {
            title: 'Owner Dashboard',
            user: req.user
        });
    } else {
        res.render('user-dashboard', {
            title: 'User Dashboard',
            user: req.user
        });
    }
});

router.get('/billing', authenticateView, (req, res) => {
    res.render('billing', {
        title: 'Billing - PowerShare',
        user: req.user
    });
});

router.get('/outage-schedule', authenticateView, (req, res) => {
    res.render('outage-schedule', {
        title: 'Outage Schedule - PowerShare',
        user: req.user
    });
});

router.get('/payment-history', authenticateView, (req, res) => {
    res.render('payment-history', {
        title: 'Payment History - PowerShare',
        user: req.user
    });
});

router.get('/notifications', authenticateView, (req, res) => {
    res.render('notifications', {
        title: 'Notifications - PowerShare',
        user: req.user
    });
});

router.get('/notification-preferences', authenticateView, (req, res) => {
    res.render('notification-preferences', {
        title: 'Notification Preferences - PowerShare',
        user: req.user
    });
});

router.get('/profile', authenticateView, (req, res) => {
    res.render('profile-settings', {
        title: 'Profile Settings - PowerShare',
        user: req.user
    });
});

router.get('/generators', authenticateView, (req, res) => {
    res.render('find-generators', {
        title: 'Find Generators - PowerShare',
        user: req.user
    });
});

router.get('/loyalty-rewards', authenticateView, (req, res) => {
    res.render('loyalty-rewards', {
        title: 'Loyalty Rewards - PowerShare',
        user: req.user
    });
});

router.get('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.redirect('/login');
});

router.get('/admin/users/:userId', authenticateView, (req, res) => {
    res.render('admin-user-detail', {
        title: 'User Details - PowerShare',
        user: req.user,
        userId: req.params.userId
    });
});

router.get('/admin/generators/:genId', authenticateView, (req, res) => {
    res.render('admin-generator-detail', {
        title: 'Generator Details - PowerShare',
        user: req.user,
        genId: req.params.genId
    });
});

router.get('/admin/loyalty-settings', authenticateView, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Access denied. Admins only.');
    }
    res.render('admin-loyalty-settings', {
        title: 'Loyalty Settings - PowerShare',
        user: req.user
    });
});

router.get('/admin/billing-settings', authenticateView, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Access denied. Admins only.');
    }
    res.render('admin-billing-settings', {
        title: 'Billing Automation Settings - PowerShare',
        user: req.user
    });
});

router.get('/generators/add', authenticateView, (req, res, next) => {
    if (req.user.role !== 'owner') {
        return res.status(403).send('Access denied. Only generator owners can add generators.');
    }
    res.render('add-generator', {
        title: 'Add Generator - PowerShare',
        user: req.user
    });
});

module.exports = router;