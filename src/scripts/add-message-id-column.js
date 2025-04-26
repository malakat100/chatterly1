const { query } = require('../config/database');

async function addMessageIdColumn() {
    try {
        console.log('Adding message_id column to user_reports table...');
        
        // Check if the column exists
        const [columns] = await query(`
            SHOW COLUMNS FROM user_reports LIKE 'message_id'
        `);
        
        if (columns.length === 0) {
            // Add the column if it doesn't exist
            await query(`
                ALTER TABLE user_reports 
                ADD COLUMN message_id INT,
                ADD FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
            `);
            console.log('Successfully added message_id column to user_reports table');
        } else {
            console.log('message_id column already exists in user_reports table');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error adding message_id column:', error);
        process.exit(1);
    }
}

addMessageIdColumn(); 