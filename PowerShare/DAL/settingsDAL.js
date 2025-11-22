const db = require('./dbConnection');

class SettingsDAL {
    async getSetting(key) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM system_settings WHERE setting_key = ?',
                [key]
            );
            return rows[0] || null;
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return null;
            }
            throw error;
        }
    }

    async getAllSettings() {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM system_settings ORDER BY setting_key'
            );
            
            const settings = {};
            rows.forEach(row => {
                settings[row.setting_key] = row.setting_value;
            });
            
            return settings;
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return this.getDefaultSettings();
            }
            throw error;
        }
    }

    async setSetting(key, value) {
        try {
            await db.execute(
                `INSERT INTO system_settings (setting_key, setting_value) 
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
                [key, value, value]
            );
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('Settings table not created yet. Settings will use defaults.');
                return;
            }
            throw error;
        }
    }

    async updateSettings(settings) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            for (const [key, value] of Object.entries(settings)) {
                await connection.execute(
                    `INSERT INTO system_settings (setting_key, setting_value) 
                     VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
                    [key, value, value]
                );
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('Settings table not created yet. Settings will use defaults.');
                return;
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async deleteSetting(key) {
        try {
            await db.execute(
                'DELETE FROM system_settings WHERE setting_key = ?',
                [key]
            );
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return;
            }
            throw error;
        }
    }

    getDefaultSettings() {
        return {
            platform_name: 'PowerShare',
            default_currency: 'USD',
            email_notifications: 'true',
            sms_notifications: 'false',
            maintenance_mode: 'false',
            max_subscriptions_per_user: '5',
            min_generator_capacity: '5',
            max_generator_capacity: '1000'
        };
    }

    async initializeDefaultSettings() {
        try {
            const defaults = this.getDefaultSettings();
            await this.updateSettings(defaults);
            console.log('Default settings initialized');
        } catch (error) {
            console.log('Settings table not created yet. Using in-memory defaults.');
        }
    }
}

module.exports = new SettingsDAL();

