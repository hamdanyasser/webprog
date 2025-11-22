const billDAL = require('../../DAL/billDAL');
const loyaltyDAL = require('../../DAL/loyaltyDAL');
const notificationDAL = require('../../DAL/notificationDAL');

class LateFeeService {
    /**
     * Process late payment fees for overdue bills
     * This should be run daily via cron job
     */
    async processLateFees() {
        try {
            console.log('🕐 Starting late fee processing...');

            // Get loyalty settings
            const settings = await loyaltyDAL.getLoyaltySettings();

            if (!settings.latePaymentFeeEnabled) {
                console.log('⚠️  Late payment fees are disabled');
                return {
                    success: true,
                    message: 'Late payment fees are disabled',
                    processed: 0
                };
            }

            // Get bills that are due for late fee
            const bills = await billDAL.getBillsDueForLateFee(settings.latePaymentGracePeriodDays);

            console.log(`📋 Found ${bills.length} bills due for late fee`);

            let processed = 0;
            const errors = [];

            for (const bill of bills) {
                try {
                    // Calculate late fee
                    const lateFee = bill.amount * (settings.latePaymentFeePercentage / 100);

                    // Apply late fee to bill
                    await billDAL.applyLatePaymentFee(bill.bill_id, lateFee);

                    // Send notification to user
                    await notificationDAL.createNotification({
                        user_id: bill.user_id,
                        title: 'Late Payment Fee Applied',
                        message: `A late fee of $${lateFee.toFixed(2)} has been applied to your bill for ${bill.generator_name}. Please pay as soon as possible to avoid further fees.`,
                        type: 'bill'
                    });

                    processed++;
                    console.log(`✅ Applied $${lateFee.toFixed(2)} late fee to bill #${bill.bill_id} for user ${bill.user_name}`);

                } catch (error) {
                    console.error(`❌ Error processing bill #${bill.bill_id}:`, error.message);
                    errors.push({
                        bill_id: bill.bill_id,
                        error: error.message
                    });
                }
            }

            console.log(`✨ Late fee processing complete. Processed: ${processed}/${bills.length}`);

            return {
                success: true,
                message: `Processed ${processed} late fees`,
                processed,
                total: bills.length,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            console.error('❌ Late fee processing failed:', error);
            return {
                success: false,
                message: 'Late fee processing failed',
                error: error.message
            };
        }
    }

    /**
     * Get bills that will incur late fees soon (for warnings)
     */
    async getUpcomingLateFees(daysAhead = 2) {
        try {
            const settings = await loyaltyDAL.getLoyaltySettings();

            if (!settings.latePaymentFeeEnabled) {
                return [];
            }

            // This would require a new DAL method, but for now we can use existing
            const overdueBills = await billDAL.getOverdueBills();

            // Filter bills that are within the warning window
            const today = new Date();
            const warningDate = new Date();
            warningDate.setDate(today.getDate() + daysAhead);

            return overdueBills.filter(bill => {
                const dueDate = new Date(bill.due_date);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                return daysOverdue >= 0 && daysOverdue < settings.latePaymentGracePeriodDays;
            });

        } catch (error) {
            console.error('Error getting upcoming late fees:', error);
            return [];
        }
    }
}

module.exports = new LateFeeService();
