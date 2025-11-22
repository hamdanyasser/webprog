const db = require('./dbConnection');

class SubscriptionDAL {
    async createSubscription(subscriptionData) {
        const { user_id, generator_id, plan_id, start_date } = subscriptionData;

        const [result] = await db.execute(
            `INSERT INTO subscriptions (user_id, generator_id, plan_id, start_date, status) 
             VALUES (?, ?, ?, ?, 'active')`,
            [user_id, generator_id, plan_id, start_date]
        );

        return result.insertId;
    }

    async findById(subscriptionId) {
        const [rows] = await db.execute(
            `SELECT s.*, 
                    u.full_name as user_name, u.email as user_email, u.phone as user_phone,
                    g.generator_name, g.location as generator_location,
                    pp.plan_name, pp.amperage, pp.monthly_price
             FROM subscriptions s
             JOIN users u ON s.user_id = u.user_id
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             WHERE s.subscription_id = ?`,
            [subscriptionId]
        );
        return rows[0];
    }

    async getByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT s.*, 
                    g.generator_name, g.location,
                    pp.plan_name, pp.amperage, pp.monthly_price,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bills
             FROM subscriptions s
             JOIN generators g ON s.generator_id = g.generator_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             LEFT JOIN bills b ON s.subscription_id = b.subscription_id
             WHERE s.user_id = ?
             GROUP BY s.subscription_id
             ORDER BY s.created_at DESC`,
            [userId]
        );
        return rows;
    }

    async getByGeneratorId(generatorId) {
        const [rows] = await db.execute(
            `SELECT s.*, 
                    u.full_name as user_name, u.email, u.phone,
                    pp.plan_name, pp.monthly_price,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bills
             FROM subscriptions s
             JOIN users u ON s.user_id = u.user_id
             JOIN pricing_plans pp ON s.plan_id = pp.plan_id
             LEFT JOIN bills b ON s.subscription_id = b.subscription_id
             WHERE s.generator_id = ? AND s.status = 'active'
             GROUP BY s.subscription_id
             ORDER BY s.created_at DESC`,
            [generatorId]
        );
        return rows;
    }

    async updateSubscription(subscriptionId, updates) {
        const { plan_id, status, end_date } = updates;

        await db.execute(
            `UPDATE subscriptions 
             SET plan_id = ?, status = ?, end_date = ?
             WHERE subscription_id = ?`,
            [plan_id, status, end_date, subscriptionId]
        );
    }

    async cancelSubscription(subscriptionId) {
        await db.execute(
            `UPDATE subscriptions 
             SET status = 'cancelled', end_date = CURRENT_DATE()
             WHERE subscription_id = ?`,
            [subscriptionId]
        );
    }
}

module.exports = new SubscriptionDAL();