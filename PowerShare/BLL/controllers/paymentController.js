const paymentDAL = require('../../DAL/paymentDAL');
const billDAL = require('../../DAL/billDAL');
const loyaltyDAL = require('../../DAL/loyaltyDAL');
const notificationDAL = require('../../DAL/notificationDAL');
const walletService = require('../services/walletService');
const emailService = require('../services/emailService');
const userDAL = require('../../DAL/userDAL');

class PaymentController {
    async createPayment(req, res) {
        try {
            const { bill_id, amount, payment_method } = req.body;

            // Get bill details first
            const bill = await billDAL.findById(bill_id);
            if (!bill) {
                return res.status(404).json({
                    success: false,
                    message: 'Bill not found'
                });
            }

            // Check if payment is early (before due date)
            const loyaltySettings = await loyaltyDAL.getLoyaltySettings();
            const currentDate = new Date();
            const dueDate = new Date(bill.due_date);
            const daysUntilDue = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));

            let earlyPaymentDiscount = 0;
            if (loyaltySettings.earlyPaymentDiscountEnabled &&
                daysUntilDue >= loyaltySettings.earlyPaymentDaysThreshold) {
                // Apply early payment discount
                earlyPaymentDiscount = bill.amount * (loyaltySettings.earlyPaymentDiscountPercentage / 100);
                await billDAL.applyEarlyPaymentDiscount(bill_id, earlyPaymentDiscount);
            }

            const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Handle wallet payment
            if (payment_method === 'wallet') {
                try {
                    // Deduct from wallet
                    await walletService.payFromWallet(
                        bill.user_id,
                        amount,
                        'USD', // Default currency, could be dynamic
                        'bill',
                        bill_id,
                        `Bill payment #${bill_id}`
                    );
                } catch (walletError) {
                    return res.status(400).json({
                        success: false,
                        message: walletError.message || 'Insufficient wallet balance'
                    });
                }
            }

            // Create payment
            const paymentId = await paymentDAL.createPayment({
                bill_id,
                amount,
                payment_method,
                transaction_id
            });

            // Award loyalty points
            const pointsToAward = Math.floor(amount * loyaltySettings.pointsPerDollar);
            if (pointsToAward > 0) {
                await loyaltyDAL.addPoints(
                    bill.user_id,
                    pointsToAward,
                    'earned',
                    'payment',
                    paymentId,
                    `Earned ${pointsToAward} points from payment of $${amount}`
                );
            }

            // Create notification
            await notificationDAL.createNotification({
                user_id: bill.user_id,
                title: 'Payment Successful',
                message: `Your payment of $${amount} has been processed. ${pointsToAward > 0 ? `You earned ${pointsToAward} loyalty points!` : ''}`,
                type: 'payment'
            });

            // Send email receipt with PDF attachment (only for non-wallet payments)
            // Wallet payments send their own receipts from wallet service
            if (payment_method !== 'wallet') {
                try {
                    const user = await userDAL.findById(bill.user_id);
                    if (user && user.email) {
                        const payment = await paymentDAL.findById(paymentId);
                        await emailService.sendPaymentReceiptEmail(
                            user.email,
                            user.full_name,
                            payment,
                            bill
                        );
                    }
                } catch (emailError) {
                    console.error('Failed to send payment receipt email:', emailError);
                    // Don't fail the payment if email fails
                }
            }

            res.status(201).json({
                success: true,
                message: 'Payment processed successfully',
                data: {
                    paymentId,
                    transaction_id,
                    points_earned: pointsToAward,
                    early_payment_discount: earlyPaymentDiscount
                }
            });
        } catch (error) {
            console.error('Payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Payment processing failed'
            });
        }
    }

    async getMyPayments(req, res) {
        try {
            const userId = req.user.user_id;
            const payments = await paymentDAL.getPaymentsByUserId(userId);

            res.json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('Get payments error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payments'
            });
        }
    }

    async getAllPayments(req, res) {
        try {
            const payments = await paymentDAL.getAllPayments();

            res.json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('Get all payments error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payments'
            });
        }
    }

    async getPaymentsByGenerator(req, res) {
        try {
            const { generatorId } = req.params;
            const payments = await paymentDAL.getPaymentsByGeneratorId(generatorId);

            res.json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('Get generator payments error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payments'
            });
        }
    }

    async getPaymentStats(req, res) {
        try {
            const { generatorId } = req.params;
            const { startDate, endDate } = req.query;

            const stats = await paymentDAL.getPaymentStats(generatorId, startDate, endDate);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get payment stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics'
            });
        }
    }
}

module.exports = new PaymentController();