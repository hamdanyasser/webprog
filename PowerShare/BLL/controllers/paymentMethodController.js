const paymentMethodDAL = require('../../DAL/paymentMethodDAL');

class PaymentMethodController {
    async getMyPaymentMethods(req, res) {
        try {
            const userId = req.user.user_id;
            const paymentMethods = await paymentMethodDAL.getByUserId(userId);

            res.json({
                success: true,
                data: paymentMethods
            });
        } catch (error) {
            console.error('Get payment methods error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment methods'
            });
        }
    }

    async addPaymentMethod(req, res) {
        try {
            const userId = req.user.user_id;
            const { card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default } = req.body;

            if (!card_type || !card_last_four || !card_holder_name || !expiry_month || !expiry_year) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            if (!/^\d{4}$/.test(card_last_four)) {
                return res.status(400).json({
                    success: false,
                    message: 'Card last four digits must be 4 numbers'
                });
            }

            if (!/^\d{2}$/.test(expiry_month) || !/^\d{4}$/.test(expiry_year)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expiry date format'
                });
            }

            const paymentMethodId = await paymentMethodDAL.create({
                user_id: userId,
                card_type: card_type.toLowerCase(),
                card_last_four,
                card_holder_name,
                expiry_month,
                expiry_year,
                is_default: is_default || false
            });

            res.status(201).json({
                success: true,
                message: 'Payment method added successfully',
                data: { payment_method_id: paymentMethodId }
            });
        } catch (error) {
            console.error('Add payment method error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add payment method'
            });
        }
    }

    async updatePaymentMethod(req, res) {
        try {
            const userId = req.user.user_id;
            const { paymentMethodId } = req.params;
            const { card_holder_name, expiry_month, expiry_year } = req.body;

            const paymentMethod = await paymentMethodDAL.findById(paymentMethodId, userId);
            if (!paymentMethod) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment method not found'
                });
            }

            await paymentMethodDAL.update(paymentMethodId, userId, {
                card_holder_name: card_holder_name || paymentMethod.card_holder_name,
                expiry_month: expiry_month || paymentMethod.expiry_month,
                expiry_year: expiry_year || paymentMethod.expiry_year
            });

            res.json({
                success: true,
                message: 'Payment method updated successfully'
            });
        } catch (error) {
            console.error('Update payment method error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update payment method'
            });
        }
    }

    async setDefaultPaymentMethod(req, res) {
        try {
            const userId = req.user.user_id;
            const { paymentMethodId } = req.params;

            const paymentMethod = await paymentMethodDAL.findById(paymentMethodId, userId);
            if (!paymentMethod) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment method not found'
                });
            }

            await paymentMethodDAL.setDefault(paymentMethodId, userId);

            res.json({
                success: true,
                message: 'Default payment method updated'
            });
        } catch (error) {
            console.error('Set default payment method error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to set default payment method'
            });
        }
    }

    async deletePaymentMethod(req, res) {
        try {
            const userId = req.user.user_id;
            const { paymentMethodId } = req.params;

            const paymentMethod = await paymentMethodDAL.findById(paymentMethodId, userId);
            if (!paymentMethod) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment method not found'
                });
            }

            await paymentMethodDAL.delete(paymentMethodId, userId);

            res.json({
                success: true,
                message: 'Payment method deleted successfully'
            });
        } catch (error) {
            console.error('Delete payment method error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete payment method'
            });
        }
    }
}

module.exports = new PaymentMethodController();

