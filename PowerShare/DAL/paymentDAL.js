const db = require('./dbConnection');

class PaymentDAL {
    async createPayment(paymentData) {
        const { bill_id, amount, payment_method, transaction_id } = paymentData;

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                `INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status) 
                 VALUES (?, ?, ?, ?, 'completed')`,
                [bill_id, amount, payment_method, transaction_id]
            );

            await connection.execute(
                'UPDATE bills SET status = ? WHERE bill_id = ?',
                ['paid', bill_id]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async findById(paymentId) {
        const [rows] = await db.execute(
            `SELECT p.*, 
                    b.amount as bill_amount, b.billing_period_start, b.billing_period_end,
                    u.full_name as user_name,
                    g.generator_name
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             JOIN generators g ON s.generator_id = g.generator_id
             WHERE p.payment_id = ?`,
            [paymentId]
        );
        return rows[0];
    }

    async getPaymentsByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT p.*, 
                    b.billing_period_start, b.billing_period_end,
                    g.generator_name
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN generators g ON s.generator_id = g.generator_id
             WHERE s.user_id = ?
             ORDER BY p.payment_date DESC`,
            [userId]
        );
        return rows;
    }

    async getPaymentsByGeneratorId(generatorId) {
        const [rows] = await db.execute(
            `SELECT p.*, 
                    u.full_name as user_name,
                    b.billing_period_start, b.billing_period_end
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             WHERE s.generator_id = ?
             ORDER BY p.payment_date DESC`,
            [generatorId]
        );
        return rows;
    }

    async getPaymentStats(generatorId, startDate, endDate) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as total_payments,
                SUM(p.amount) as total_amount,
                COUNT(DISTINCT s.user_id) as unique_payers
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             WHERE s.generator_id = ? 
             AND p.payment_date BETWEEN ? AND ?
             AND p.status = 'completed'`,
            [generatorId, startDate, endDate]
        );
        return rows[0];
    }

    async getAllPayments() {
        const [rows] = await db.execute(
            `SELECT p.*, 
                    u.full_name as user_name,
                    b.billing_period_start, b.billing_period_end
             FROM payments p
             JOIN bills b ON p.bill_id = b.bill_id
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             ORDER BY p.payment_date DESC`
        );
        return rows;
    }
}

module.exports = new PaymentDAL();