const db = require('./dbConnection');

class PaymentMethodDAL {
    async getByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT * FROM payment_methods 
             WHERE user_id = ? 
             ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );
        return rows;
    }

    async getDefaultByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT * FROM payment_methods 
             WHERE user_id = ? AND is_default = TRUE 
             LIMIT 1`,
            [userId]
        );
        return rows[0];
    }

    async create(paymentMethodData) {
        const { user_id, card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default } = paymentMethodData;

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            if (is_default) {
                await connection.execute(
                    'UPDATE payment_methods SET is_default = FALSE WHERE user_id = ?',
                    [user_id]
                );
            }

            const [result] = await connection.execute(
                `INSERT INTO payment_methods (user_id, card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user_id, card_type, card_last_four, card_holder_name, expiry_month, expiry_year, is_default || false]
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

    async update(paymentMethodId, userId, updates) {
        const { card_holder_name, expiry_month, expiry_year } = updates;

        await db.execute(
            `UPDATE payment_methods 
             SET card_holder_name = ?, expiry_month = ?, expiry_year = ?
             WHERE payment_method_id = ? AND user_id = ?`,
            [card_holder_name, expiry_month, expiry_year, paymentMethodId, userId]
        );
    }

    async setDefault(paymentMethodId, userId) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            await connection.execute(
                'UPDATE payment_methods SET is_default = FALSE WHERE user_id = ?',
                [userId]
            );

            await connection.execute(
                'UPDATE payment_methods SET is_default = TRUE WHERE payment_method_id = ? AND user_id = ?',
                [paymentMethodId, userId]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async delete(paymentMethodId, userId) {
        await db.execute(
            'DELETE FROM payment_methods WHERE payment_method_id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );
    }

    async findById(paymentMethodId, userId) {
        const [rows] = await db.execute(
            'SELECT * FROM payment_methods WHERE payment_method_id = ? AND user_id = ?',
            [paymentMethodId, userId]
        );
        return rows[0];
    }
}

module.exports = new PaymentMethodDAL();

