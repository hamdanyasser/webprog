const subscriptionDAL = require('../../DAL/subscriptionDAL');
const billDAL = require('../../DAL/billDAL');
const loyaltyDAL = require('../../DAL/loyaltyDAL');
const notificationDAL = require('../../DAL/notificationDAL');
const emailService = require('./emailService');

class BillingService {
    /**
     * Generate monthly bills for all active subscriptions
     * This is the main automated billing function
     */
    async generateMonthlyBills() {
        try {
            console.log('🔄 Starting automated monthly bill generation...');
            const startTime = Date.now();

            // Get billing settings
            const settings = await this.getBillingSettings();

            if (!settings.automatedBillingEnabled) {
                console.log('⚠️  Automated billing is disabled');
                return {
                    success: true,
                    message: 'Automated billing is disabled',
                    generated: 0
                };
            }

            // Get all active subscriptions
            const subscriptions = await this.getActiveSubscriptions();
            console.log(`📋 Found ${subscriptions.length} active subscriptions`);

            const results = {
                generated: 0,
                skipped: 0,
                errors: [],
                bills: []
            };

            // Calculate billing period
            const now = new Date();
            const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const dueDate = new Date(billingPeriodEnd);
            dueDate.setDate(dueDate.getDate() + settings.paymentDueDays);

            console.log(`📅 Billing period: ${billingPeriodStart.toISOString().split('T')[0]} to ${billingPeriodEnd.toISOString().split('T')[0]}`);
            console.log(`⏰ Due date: ${dueDate.toISOString().split('T')[0]}`);

            // Process each subscription
            for (const subscription of subscriptions) {
                try {
                    // Check if bill already exists for this period
                    const existingBill = await this.checkExistingBill(
                        subscription.subscription_id,
                        billingPeriodStart,
                        billingPeriodEnd
                    );

                    if (existingBill) {
                        console.log(`⏭️  Skipping subscription ${subscription.subscription_id} - Bill already exists`);
                        results.skipped++;
                        continue;
                    }

                    // Create bill
                    const billId = await billDAL.createBill({
                        subscription_id: subscription.subscription_id,
                        amount: subscription.monthly_price,
                        billing_period_start: billingPeriodStart.toISOString().split('T')[0],
                        billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
                        due_date: dueDate.toISOString().split('T')[0]
                    });

                    console.log(`✅ Created bill #${billId} for subscription ${subscription.subscription_id} - $${subscription.monthly_price}`);

                    results.generated++;
                    results.bills.push({
                        bill_id: billId,
                        subscription_id: subscription.subscription_id,
                        user_id: subscription.user_id,
                        amount: subscription.monthly_price
                    });

                    // Send email notification
                    if (settings.sendEmailNotifications && subscription.email_notifications) {
                        await this.sendBillNotification(subscription, billId, subscription.monthly_price, dueDate);
                    }

                    // Create in-app notification
                    await notificationDAL.createNotification({
                        user_id: subscription.user_id,
                        title: 'New Bill Available',
                        message: `Your ${subscription.plan_name} bill for ${subscription.generator_name} is now available. Amount: $${subscription.monthly_price}. Due: ${dueDate.toISOString().split('T')[0]}`,
                        type: 'bill'
                    });

                } catch (error) {
                    console.error(`❌ Error processing subscription ${subscription.subscription_id}:`, error.message);
                    results.errors.push({
                        subscription_id: subscription.subscription_id,
                        error: error.message
                    });
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n✨ Bill generation complete in ${duration}s`);
            console.log(`📊 Summary: ${results.generated} generated, ${results.skipped} skipped, ${results.errors.length} errors`);

            return {
                success: true,
                message: `Generated ${results.generated} bills`,
                ...results,
                duration
            };

        } catch (error) {
            console.error('❌ Monthly bill generation failed:', error);
            return {
                success: false,
                message: 'Bill generation failed',
                error: error.message
            };
        }
    }

    /**
     * Generate bills for a specific generator
     */
    async generateBillsForGenerator(generatorId) {
        try {
            console.log(`🔄 Generating bills for generator ${generatorId}...`);

            // Get settings
            const settings = await this.getBillingSettings();

            // Get active subscriptions for this generator
            const subscriptions = await subscriptionDAL.getByGeneratorId(generatorId);
            const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

            console.log(`📋 Found ${activeSubscriptions.length} active subscriptions`);

            const results = {
                generated: 0,
                skipped: 0,
                errors: []
            };

            // Calculate billing period
            const now = new Date();
            const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const dueDate = new Date(billingPeriodEnd);
            dueDate.setDate(dueDate.getDate() + settings.paymentDueDays);

            // Process each subscription
            for (const subscription of activeSubscriptions) {
                try {
                    // Check if bill already exists
                    const existingBill = await this.checkExistingBill(
                        subscription.subscription_id,
                        billingPeriodStart,
                        billingPeriodEnd
                    );

                    if (existingBill) {
                        results.skipped++;
                        continue;
                    }

                    // Get plan details
                    const plan = await this.getPlanDetails(subscription.plan_id);

                    // Create bill
                    const billId = await billDAL.createBill({
                        subscription_id: subscription.subscription_id,
                        amount: plan.monthly_price,
                        billing_period_start: billingPeriodStart.toISOString().split('T')[0],
                        billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
                        due_date: dueDate.toISOString().split('T')[0]
                    });

                    results.generated++;

                    // Send notifications
                    if (settings.sendEmailNotifications) {
                        await this.sendBillNotification({
                            ...subscription,
                            monthly_price: plan.monthly_price,
                            plan_name: plan.plan_name
                        }, billId, plan.monthly_price, dueDate);
                    }

                    await notificationDAL.createNotification({
                        user_id: subscription.user_id,
                        title: 'New Bill Available',
                        message: `Your bill for ${plan.plan_name} is ready. Amount: $${plan.monthly_price}`,
                        type: 'bill'
                    });

                } catch (error) {
                    console.error(`Error processing subscription ${subscription.subscription_id}:`, error);
                    results.errors.push({
                        subscription_id: subscription.subscription_id,
                        error: error.message
                    });
                }
            }

            console.log(`✨ Generated ${results.generated} bills, skipped ${results.skipped}, ${results.errors.length} errors`);

            return {
                success: true,
                message: `Generated ${results.generated} bills for generator ${generatorId}`,
                ...results
            };

        } catch (error) {
            console.error('Error generating bills for generator:', error);
            return {
                success: false,
                message: 'Failed to generate bills',
                error: error.message
            };
        }
    }

    /**
     * Check if bill already exists for a subscription in a given period
     */
    async checkExistingBill(subscriptionId, periodStart, periodEnd) {
        try {
            const db = require('../../DAL/dbConnection');
            const [rows] = await db.execute(
                `SELECT bill_id FROM bills
                 WHERE subscription_id = ?
                 AND billing_period_start = ?
                 AND billing_period_end = ?`,
                [subscriptionId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
            );
            return rows[0];
        } catch (error) {
            console.error('Error checking existing bill:', error);
            return null;
        }
    }

    /**
     * Get all active subscriptions with user and plan details
     */
    async getActiveSubscriptions() {
        try {
            const db = require('../../DAL/dbConnection');
            const [rows] = await db.execute(
                `SELECT
                    s.subscription_id,
                    s.user_id,
                    s.generator_id,
                    s.plan_id,
                    u.full_name,
                    u.email,
                    u.email_notifications,
                    g.generator_name,
                    pp.plan_name,
                    pp.monthly_price
                 FROM subscriptions s
                 JOIN users u ON s.user_id = u.user_id
                 JOIN generators g ON s.generator_id = g.generator_id
                 JOIN pricing_plans pp ON s.plan_id = pp.plan_id
                 WHERE s.status = 'active'
                 AND u.email_verified = TRUE`
            );
            return rows;
        } catch (error) {
            console.error('Error getting active subscriptions:', error);
            return [];
        }
    }

    /**
     * Get plan details
     */
    async getPlanDetails(planId) {
        try {
            const db = require('../../DAL/dbConnection');
            const [rows] = await db.execute(
                'SELECT plan_name, monthly_price FROM pricing_plans WHERE plan_id = ?',
                [planId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error getting plan details:', error);
            return null;
        }
    }

    /**
     * Send bill notification email
     */
    async sendBillNotification(subscription, billId, amount, dueDate) {
        try {
            await emailService.sendBillNotification(
                subscription.email,
                subscription.full_name,
                {
                    bill_id: billId,
                    generator_name: subscription.generator_name,
                    plan_name: subscription.plan_name,
                    amount: amount,
                    due_date: dueDate.toISOString().split('T')[0]
                }
            );
        } catch (error) {
            console.error('Error sending bill notification email:', error);
        }
    }

    /**
     * Get billing automation settings
     */
    async getBillingSettings() {
        try {
            const settings = await loyaltyDAL.getAllSettings();
            return {
                automatedBillingEnabled: settings.automated_billing_enabled !== undefined
                    ? settings.automated_billing_enabled
                    : true,
                billingDayOfMonth: settings.billing_day_of_month || 1,
                paymentDueDays: settings.payment_due_days || 7,
                sendEmailNotifications: settings.send_bill_email_notifications !== undefined
                    ? settings.send_bill_email_notifications
                    : true,
                sendSmsNotifications: settings.send_bill_sms_notifications || false
            };
        } catch (error) {
            console.error('Error getting billing settings:', error);
            // Return defaults
            return {
                automatedBillingEnabled: true,
                billingDayOfMonth: 1,
                paymentDueDays: 7,
                sendEmailNotifications: true,
                sendSmsNotifications: false
            };
        }
    }

    /**
     * Get billing statistics
     */
    async getBillingStatistics() {
        try {
            const db = require('../../DAL/dbConnection');

            // Get current month stats
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const [stats] = await db.execute(
                `SELECT
                    COUNT(*) as total_bills,
                    SUM(amount) as total_amount,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bills,
                    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
                    SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_bills
                 FROM bills
                 WHERE billing_period_start >= ? AND billing_period_end <= ?`,
                [monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]]
            );

            return stats[0] || {
                total_bills: 0,
                total_amount: 0,
                pending_bills: 0,
                paid_bills: 0,
                overdue_bills: 0
            };
        } catch (error) {
            console.error('Error getting billing statistics:', error);
            return null;
        }
    }
}

module.exports = new BillingService();
