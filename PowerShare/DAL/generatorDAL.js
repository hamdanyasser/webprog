const db = require('./dbConnection');

class GeneratorDAL {
    async createGenerator(generatorData) {
        const { owner_id, generator_name, location, capacity_kw } = generatorData;

        const [result] = await db.execute(
            `INSERT INTO generators (owner_id, generator_name, location, capacity_kw, status) 
             VALUES (?, ?, ?, ?, 'active')`,
            [owner_id, generator_name, location, capacity_kw]
        );

        return result.insertId;
    }

    async findById(generatorId) {
        const [rows] = await db.execute(
            `SELECT g.*, u.full_name as owner_name, u.email as owner_email,
                    COUNT(DISTINCT s.subscription_id) as subscriber_count
             FROM generators g
             LEFT JOIN users u ON g.owner_id = u.user_id
             LEFT JOIN subscriptions s ON g.generator_id = s.generator_id AND s.status = 'active'
             WHERE g.generator_id = ?
             GROUP BY g.generator_id`,
            [generatorId]
        );
        return rows[0];
    }

    async getAllGenerators() {
        const [rows] = await db.execute(
            `SELECT g.*, u.full_name as owner_name,
                    COUNT(DISTINCT s.subscription_id) as subscriber_count
             FROM generators g
             LEFT JOIN users u ON g.owner_id = u.user_id
             LEFT JOIN subscriptions s ON g.generator_id = s.generator_id AND s.status = 'active'
             GROUP BY g.generator_id
             ORDER BY g.created_at DESC`
        );
        return rows;
    }

    async getByOwnerId(ownerId) {
        const [rows] = await db.execute(
            `SELECT g.*,
                    COUNT(DISTINCT s.subscription_id) as subscriber_count,
                    SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END) as total_revenue
             FROM generators g
             LEFT JOIN subscriptions s ON g.generator_id = s.generator_id AND s.status = 'active'
             LEFT JOIN bills b ON s.subscription_id = b.subscription_id
             WHERE g.owner_id = ?
             GROUP BY g.generator_id
             ORDER BY g.created_at DESC`,
            [ownerId]
        );
        return rows;
    }

    async updateGenerator(generatorId, updates) {
        const allowedFields = ['generator_name', 'location', 'capacity_kw', 'status'];
        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }

        updateValues.push(generatorId);

        await db.execute(
            `UPDATE generators SET ${updateFields.join(', ')} WHERE generator_id = ?`,
            updateValues
        );
    }

    async deleteGenerator(generatorId) {
        await db.execute('DELETE FROM generators WHERE generator_id = ?', [generatorId]);
    }

    async getGeneratorStats(generatorId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(DISTINCT s.subscription_id) as total_subscribers,
                COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.subscription_id END) as active_subscribers,
                SUM(CASE WHEN b.status = 'paid' AND MONTH(b.created_at) = MONTH(CURRENT_DATE()) 
                    THEN b.amount ELSE 0 END) as monthly_revenue,
                SUM(CASE WHEN b.status = 'pending' THEN b.amount ELSE 0 END) as pending_revenue
             FROM generators g
             LEFT JOIN subscriptions s ON g.generator_id = s.generator_id
             LEFT JOIN bills b ON s.subscription_id = b.subscription_id
             WHERE g.generator_id = ?`,
            [generatorId]
        );
        return rows[0];
    }
}

module.exports = new GeneratorDAL();