const { query } = require('../config/database');

async function recreateReportsTable() {
    try {
        console.log('Dropping user_reports table...');
        await query('DROP TABLE IF EXISTS user_reports');
        
        console.log('Creating user_reports table...');
        await query(`
            CREATE TABLE user_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reporter_id INT NOT NULL,
                reported_id INT NOT NULL,
                message_id INT,
                reason TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved BOOLEAN DEFAULT false,
                FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
            )
        `);
        
        console.log('Successfully recreated user_reports table');
        process.exit(0);
    } catch (error) {
        console.error('Error recreating table:', error);
        process.exit(1);
    }
}

recreateReportsTable(); 