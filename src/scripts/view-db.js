const { query } = require('../config/database');

async function viewDatabase() {
    try {
        console.log('=== Database Contents ===\n');

        // Get all tables
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [process.env.DB_NAME || 'chat_site']);

        for (const table of tables) {
            const tableName = table.table_name;
            console.log(`\n=== ${tableName.toUpperCase()} ===`);
            
            // Get table structure
            const structure = await query(`
                SHOW COLUMNS FROM ${tableName}
            `);
            console.log('\nStructure:');
            structure.forEach(col => {
                console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : ''}`);
            });

            // Get table contents
            const contents = await query(`
                SELECT * FROM ${tableName}
            `);
            console.log('\nContents:');
            if (contents.length === 0) {
                console.log('No records found');
            } else {
                console.log(JSON.stringify(contents, null, 2));
            }
            console.log('\n' + '='.repeat(50));
        }
    } catch (error) {
        console.error('Error viewing database:', error);
    } finally {
        process.exit();
    }
}

viewDatabase(); 