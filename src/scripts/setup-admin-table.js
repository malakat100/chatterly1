const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupAdminTable() {
    try {
        // Drop the existing table if it exists
        await db.query('DROP TABLE IF EXISTS admin_users');
        console.log('Dropped existing admin_users table');

        // Create the table with proper structure
        await db.query(`
            CREATE TABLE admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created new admin_users table');

        // Create admin user
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin', saltRounds);

        await db.query(`
            INSERT INTO admin_users (username, password)
            VALUES (?, ?)
        `, ['admin', hashedPassword]);

        console.log('Created admin user with credentials:');
        console.log('Username: admin');
        console.log('Password: admin');
    } catch (error) {
        console.error('Error setting up admin table:', error);
    }
}

setupAdminTable(); 