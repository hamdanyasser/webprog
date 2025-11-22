#!/usr/bin/env node

/**
 * Automated Monthly Bill Generation Cron Job
 *
 * This script should be run via cron on the 1st of each month.
 * It generates bills for all active subscriptions automatically.
 *
 * Example crontab entry (runs at 2:00 AM on the 1st of each month):
 * 0 2 1 * * /usr/bin/node /path/to/PowerShare/scripts/cronBillingJob.js >> /var/log/powershare-billing.log 2>&1
 *
 * Or using node-cron (see setupCronJobs.js):
 * This file can also be imported and used with node-cron package
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const billingService = require('../BLL/services/billingService');
const db = require('../DAL/dbConnection');

async function runBillingJob() {
    console.log('='.repeat(60));
    console.log('🤖 AUTOMATED BILLING JOB STARTED');
    console.log('='.repeat(60));
    console.log(`⏰ Execution Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
        // Check if automated billing is enabled
        const settings = await billingService.getBillingSettings();

        if (!settings.automatedBillingEnabled) {
            console.log('⚠️  Automated billing is DISABLED in settings');
            console.log('💡 Enable it in Admin Dashboard > Billing Settings');
            console.log('='.repeat(60));
            process.exit(0);
        }

        console.log('✅ Automated billing is ENABLED');
        console.log(`📅 Billing Day of Month: ${settings.billingDayOfMonth}`);
        console.log(`⏳ Payment Due Days: ${settings.paymentDueDays}`);
        console.log(`📧 Email Notifications: ${settings.sendEmailNotifications ? 'ON' : 'OFF'}`);
        console.log('='.repeat(60));

        // Run bill generation
        const result = await billingService.generateMonthlyBills();

        // Display results
        console.log('');
        console.log('📊 RESULTS:');
        console.log('-'.repeat(60));
        console.log(`✅ Bills Generated: ${result.generated}`);
        console.log(`⏭️  Bills Skipped: ${result.skipped} (already exist)`);
        console.log(`❌ Errors: ${result.errors.length}`);
        console.log(`⏱️  Duration: ${result.duration}s`);
        console.log('-'.repeat(60));

        // Show errors if any
        if (result.errors.length > 0) {
            console.log('');
            console.log('❌ ERRORS ENCOUNTERED:');
            console.log('-'.repeat(60));
            result.errors.forEach((error, index) => {
                console.log(`${index + 1}. Subscription ${error.subscription_id}: ${error.error}`);
            });
            console.log('-'.repeat(60));
        }

        // Show sample bills
        if (result.bills && result.bills.length > 0) {
            console.log('');
            console.log('📋 SAMPLE BILLS GENERATED (first 5):');
            console.log('-'.repeat(60));
            result.bills.slice(0, 5).forEach((bill, index) => {
                console.log(`${index + 1}. Bill #${bill.bill_id} - User ${bill.user_id} - $${bill.amount}`);
            });
            if (result.bills.length > 5) {
                console.log(`... and ${result.bills.length - 5} more`);
            }
            console.log('-'.repeat(60));
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('✨ AUTOMATED BILLING JOB COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('❌ AUTOMATED BILLING JOB FAILED');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(60));
        process.exit(1);

    } finally {
        // Close database connection
        try {
            await db.end();
            console.log('🔌 Database connection closed');
        } catch (err) {
            console.error('Error closing database:', err);
        }
    }
}

// Run the job
runBillingJob();
