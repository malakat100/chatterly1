const db = require('../config/database');

async function checkTable() {
    try {
        // Show table structure
        const [columns] = await db.query('DESCRIBE admin_users');
        console.log('Admin Users Table Structure:');
        console.log(columns);

        // Show current data
        const [data] = await db.query('SELECT * FROM admin_users');
        console.log('\nCurrent Data:');
        console.log(data);
    } catch (error) {
        console.error('Error checking table:', error);
    }
}

checkTable(); 