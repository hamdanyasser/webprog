const db = require('./dbConnection');

class PricingPlanDAL {
    async createPlan(planData) {
        const { generator_id, plan_name, amperage, monthly_price, description } = planData;

        const [result] = await db.execute(
            `INSERT INTO pricing_plans (generator_id, plan_name, amperage, monthly_price, description) 
             VALUES (?, ?, ?, ?, ?)`,
            [generator_id, plan_name, amperage, monthly_price, description]
        );

        return result.insertId;
    }

    async getAll() {
        const [rows] = await db.execute(
            `SELECT pp.*, g.generator_name,
                    COUNT(s.subscription_id) as subscriber_count
             FROM pricing_plans pp
             LEFT JOIN generators g ON pp.generator_id = g.generator_id
             LEFT JOIN subscriptions s ON pp.plan_id = s.plan_id AND s.status = 'active'
             WHERE pp.is_active = TRUE
             GROUP BY pp.plan_id
             ORDER BY pp.monthly_price ASC`
        );
        return rows;
    }

    async findById(planId) {
        const [rows] = await db.execute(
            `SELECT pp.*, g.generator_name,
                    COUNT(s.subscription_id) as subscriber_count
             FROM pricing_plans pp
             LEFT JOIN generators g ON pp.generator_id = g.generator_id
             LEFT JOIN subscriptions s ON pp.plan_id = s.plan_id AND s.status = 'active'
             WHERE pp.plan_id = ?
             GROUP BY pp.plan_id`,
            [planId]
        );
        return rows[0];
    }

    async getPlansByGenerator(generatorId) {
        const [rows] = await db.execute(
            `SELECT pp.*,
                    COUNT(s.subscription_id) as subscriber_count
             FROM pricing_plans pp
             LEFT JOIN subscriptions s ON pp.plan_id = s.plan_id AND s.status = 'active'
             WHERE pp.generator_id = ? AND pp.is_active = TRUE
             GROUP BY pp.plan_id
             ORDER BY pp.monthly_price ASC`,
            [generatorId]
        );
        return rows;
    }

    async updatePlan(planId, updates) {
        const { plan_name, amperage, monthly_price, description, is_active } = updates;

        const fields = [];
        const values = [];

        if (plan_name !== undefined) {
            fields.push('plan_name = ?');
            values.push(plan_name);
        }
        if (amperage !== undefined) {
            fields.push('amperage = ?');
            values.push(amperage);
        }
        if (monthly_price !== undefined) {
            fields.push('monthly_price = ?');
            values.push(monthly_price);
        }
        if (description !== undefined) {
            fields.push('description = ?');
            values.push(description);
        }
        if (is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(is_active);
        }

        if (fields.length === 0) {
            return; 
        }

        values.push(planId);

        await db.execute(
            `UPDATE pricing_plans SET ${fields.join(', ')} WHERE plan_id = ?`,
            values
        );
    }

    async deletePlan(planId) {
        await db.execute('UPDATE pricing_plans SET is_active = FALSE WHERE plan_id = ?', [planId]);
    }
}

module.exports = new PricingPlanDAL();