const db = require('./dbConnection');

class BillDAL {
    async createBill(billData) {
        const { subscription_id, amount, billing_period_start, billing_period_end, due_date } = billData;

        const [result] = await db.execute(
            `INSERT INTO bills (subscription_id, amount, billing_period_start, billing_period_end, due_date, status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [subscription_id, amount, billing_period_start, billing_period_end, due_date]
        );

        return result.insertId;
    }

    async findById(billId) {
        const [rows] = await db.execute(
            `SELECT b.*, 
                    s.user_id, s.generator_id,
                    u.full_name as user_name, u.email as user_email,
                    g.generator_name,
                    pp.plan_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE b.bill_id = ?`,
            [billId]
        );
        return rows[0];
    }

    async getBillsByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT b.*, 
                    g.generator_name,
                    pp.plan_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE s.user_id = ?
             ORDER BY b.due_date DESC`,
            [userId]
        );
        return rows;
    }

    async getBillsByGeneratorId(generatorId) {
        const [rows] = await db.execute(
            `SELECT b.*, 
                    u.full_name as user_name, u.email,
                    pp.plan_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE s.generator_id = ?
             ORDER BY b.due_date DESC`,
            [generatorId]
        );
        return rows;
    }

    async updateBillStatus(billId, status) {
        await db.execute(
            'UPDATE bills SET status = ? WHERE bill_id = ?',
            [status, billId]
        );
    }

    async getPendingBillsByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT b.*, 
                    g.generator_name,
                    pp.plan_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE s.user_id = ? AND b.status = 'pending'
             ORDER BY b.due_date ASC`,
            [userId]
        );
        return rows;
    }

    async getOverdueBills() {
        const [rows] = await db.execute(
            `SELECT b.*, 
                    u.full_name as user_name, u.email,
                    g.generator_name
             FROM bills b
             JOIN subscriptions s ON b.subscription_id = s.subscription_id
             JOIN users u ON s.user_id = u.user_id
             JOIN generators g ON s.generator_id = g.generator_id
             WHERE b.status = 'pending' AND b.due_date < CURRENT_DATE()`
        );
        return rows;
    }
}

module.exports = new BillDAL();