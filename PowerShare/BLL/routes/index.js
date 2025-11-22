const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./users');
const generatorRoutes = require('./generators');
const billRoutes = require('./bills');
const paymentRoutes = require('./payments');
const paymentMethodRoutes = require('./paymentMethods');
const scheduleRoutes = require('./schedules');
const notificationRoutes = require('./notifications');
const notificationPreferencesRoutes = require('./notificationPreferences');
const subscriptionRoutes = require('./subscriptions');
const pricingPlanRoutes = require('./pricingPlans');
const adminRoutes = require('./admin');
const loyaltyRoutes = require('./loyalty');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/generators', generatorRoutes);
router.use('/bills', billRoutes);
router.use('/payments', paymentRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationPreferencesRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/pricing-plans', pricingPlanRoutes);
router.use('/admin', adminRoutes);
router.use('/loyalty', loyaltyRoutes);

module.exports = router;