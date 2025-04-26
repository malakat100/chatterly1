const { query } = require('../config/database');

async function checkTableStructure() {
    try {
        console.log('Checking structure of user_reports table...');
        
        // Get table structure
        const columns = await query(`
            SHOW COLUMNS FROM user_reports
        `);
        
        console.log('Table structure:');
        console.log(JSON.stringify(columns, null, 2));
        
        // Check if message_id column exists
        const hasMessageId = columns.some(col => col.Field === 'message_id');
        console.log(`message_id column exists: ${hasMessageId}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking table structure:', error);
        process.exit(1);
    }
}

checkTableStructure(); 