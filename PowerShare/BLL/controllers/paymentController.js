const paymentDAL = require('../../DAL/paymentDAL');
const billDAL = require('../../DAL/billDAL');

class PaymentController {
    async createPayment(req, res) {
        try {
            const { bill_id, amount, payment_method } = req.body;

            const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const paymentId = await paymentDAL.createPayment({
                bill_id,
                amount,
                payment_method,
                transaction_id
            });

            res.status(201).json({
                success: true,
                message: 'Payment processed successfully',
                data: { paymentId, transaction_id }
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