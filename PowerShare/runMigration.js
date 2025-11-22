const fs = require('fs');
const path = require('path');
const db = require('./DAL/dbConnection');

async function runMigration() {
    try {
        console.log('🚀 Starting loyalty system migration...\n');

        const migrationPath = path.join(__dirname, 'migrations', '001_loyalty_system.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolons and filter out comments and empty statements
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => {
                return stmt.length > 0 &&
                       !stmt.startsWith('--') &&
                       !stmt.startsWith('/*') &&
                       stmt.toLowerCase() !== 'use powershare_db2';
            });

        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Skip empty statements
            if (!stmt || stmt.trim().length === 0) continue;

            try {
                // Extract statement type for logging
                const stmtType = stmt.split(' ')[0].toUpperCase();

                if (stmtType === 'SELECT') {
                    const [rows] = await db.query(stmt);
                    console.log(`✅ ${rows[0]?.Status || 'Query executed'}`);
                } else {
                    await db.query(stmt);
                    console.log(`✅ Executed: ${stmtType} statement (${i + 1}/${statements.length})`);
                }
            } catch (error) {
                // Ignore "duplicate column" errors (in case migration already ran)
                if (error.code === 'ER_DUP_FIELDNAME' ||
                    error.code === 'ER_TABLE_EXISTS_ERROR' ||
                    error.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️  Skipped: ${error.message}`);
                } else {
                    console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                    console.error('Statement:', stmt.substring(0, 100) + '...');
                    throw error;
                }
            }
        }

        console.log('\n✨ Migration completed successfully!\n');

        // Verify the migration
        console.log('🔍 Verifying migration...\n');

        const [tables] = await db.query("SHOW TABLES LIKE 'loyalty%'");
        console.log(`✅ Created ${tables.length} loyalty tables`);

        const [settings] = await db.query("SELECT COUNT(*) as count FROM platform_settings");
        console.log(`✅ Inserted ${settings[0].count} platform settings`);

        const [tiers] = await db.query("SELECT COUNT(*) as count FROM loyalty_tiers");
        console.log(`✅ Created ${tiers[0].count} loyalty tiers (Bronze, Silver, Gold)`);

        console.log('\n🎉 All done! Loyalty & Rewards System is ready to use!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
