const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        // First, drop the admin user if it exists
        await db.query('DELETE FROM admin_users WHERE username = ?', ['admin']);
        console.log('Deleted existing admin user');

        // Create new admin user with hashed password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin', saltRounds);

        await db.query(`
            INSERT INTO admin_users (username, password_hash)
            VALUES (?, ?)
        `, ['admin', hashedPassword]);

        console.log('Admin user reset successfully');
        console.log('New credentials:');
        console.log('Username: admin');
        console.log('Password: admin');
    } catch (error) {
        console.error('Error resetting admin:', error);
    }
}

resetAdmin(); 