/**
 * PowerShare Automated Billing - Cron Job Setup
 *
 * This module sets up automated cron jobs for:
 * 1. Monthly bill generation
 * 2. Payment reminders
 * 3. Overdue bill checking
 *
 * Usage:
 * 1. Install node-cron: npm install node-cron
 * 2. Import this in server.js: require('./scripts/setupCronJobs')
 * 3. Jobs will run automatically based on schedule
 */

const cron = require('node-cron');
const billingService = require('../BLL/services/billingService');

console.log('⚙️  Setting up automated billing cron jobs...');

/**
 * Job 1: Monthly Bill Generation
 * Runs at 2:00 AM on the 1st of every month
 * Cron: "0 2 1 * *" = minute 0, hour 2, day 1, every month
 */
const monthlyBillingJob = cron.schedule('0 2 1 * *', async () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('🤖 MONTHLY BILLING JOB TRIGGERED');
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
        const result = await billingService.generateMonthlyBills();

        console.log(`✅ Generated ${result.generated} bills`);
        console.log(`⏭️  Skipped ${result.skipped} bills`);
        console.log(`❌ ${result.errors.length} errors`);
        console.log(`⏱️  Duration: ${result.duration}s`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Monthly billing job failed:', error);
        console.error('='.repeat(60));
    }
}, {
    scheduled: true,
    timezone: "Asia/Beirut" // Lebanon timezone
});

/**
 * Job 2: Daily Overdue Check
 * Runs at 3:00 AM every day
 * Cron: "0 3 * * *" = minute 0, hour 3, every day
 */
const overdueCheckJob = cron.schedule('0 3 * * *', async () => {
    console.log('🔍 OVERDUE CHECK JOB TRIGGERED');

    try {
        const settings = await billingService.getBillingSettings();

        if (!settings.automatedBillingEnabled) {
            console.log('⚠️  Automated billing is disabled, skipping overdue check');
            return;
        }

        // Check for overdue bills
        const db = require('../DAL/dbConnection');
        const today = new Date().toISOString().split('T')[0];

        const [result] = await db.execute(
            `UPDATE bills
             SET status = 'overdue'
             WHERE status = 'pending'
             AND due_date < ?
             AND due_date >= DATE_SUB(?, INTERVAL 30 DAY)`,
            [today, today]
        );

        console.log(`✅ Marked ${result.affectedRows} bills as overdue`);

    } catch (error) {
        console.error('❌ Overdue check job failed:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Beirut"
});

/**
 * Job 3: Payment Reminders
 * Runs at 10:00 AM every day
 * Cron: "0 10 * * *" = minute 0, hour 10, every day
 */
const paymentReminderJob = cron.schedule('0 10 * * *', async () => {
    console.log('📧 PAYMENT REMINDER JOB TRIGGERED');

    try {
        const settings = await billingService.getBillingSettings();

        if (!settings.sendEmailNotifications) {
            console.log('⚠️  Email notifications disabled, skipping reminders');
            return;
        }

        const db = require('../DAL/dbConnection');
        const emailService = require('../BLL/services/emailService');
        const notificationDAL = require('../DAL/notificationDAL');

        // Get bills due in X days (from settings)
        const reminderDays = 3; // Default, can be fetched from settings
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + reminderDays);

        const [bills] = await db.execute(
            `SELECT
                b.bill_id,
                b.amount,
                b.due_date,
                u.user_id,
                u.full_name,
                u.email,
                u.email_notifications,
                g.generator_name,
                pp.plan_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE b.status = 'pending'
             AND b.due_date = ?
             AND u.email_verified = TRUE
             AND u.email_notifications = TRUE`,
            [reminderDate.toISOString().split('T')[0]]
        );

        let sent = 0;

        for (const bill of bills) {
            try {
                // Send email reminder
                await emailService.sendBillNotification(
                    bill.email,
                    bill.full_name,
                    {
                        bill_id: bill.bill_id,
                        generator_name: bill.generator_name,
                        plan_name: bill.plan_name,
                        amount: bill.amount,
                        due_date: bill.due_date
                    }
                );

                // Create in-app notification
                await notificationDAL.createNotification({
                    user_id: bill.user_id,
                    title: 'Payment Reminder',
                    message: `Your bill for ${bill.plan_name} is due in ${reminderDays} days. Amount: $${bill.amount}`,
                    type: 'reminder'
                });

                sent++;

            } catch (error) {
                console.error(`Failed to send reminder for bill ${bill.bill_id}:`, error.message);
            }
        }

        console.log(`✅ Sent ${sent} payment reminders (${bills.length} bills due in ${reminderDays} days)`);

    } catch (error) {
        console.error('❌ Payment reminder job failed:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Beirut"
});

console.log('✅ Cron jobs initialized:');
console.log('   📅 Monthly Billing: 2:00 AM on 1st of each month');
console.log('   🔍 Overdue Check: 3:00 AM daily');
console.log('   📧 Payment Reminders: 10:00 AM daily');

module.exports = {
    monthlyBillingJob,
    overdueCheckJob,
    paymentReminderJob
};
