const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
    try {
        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin123', saltRounds);

        // Update admin password
        await db.query(`
            UPDATE admin_users 
            SET password = ?
            WHERE username = 'admin'
        `, [hashedPassword]);

        console.log('Admin password reset successfully');
        console.log('New credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
    } catch (error) {
        console.error('Error resetting admin password:', error);
    }
}

resetAdminPassword(); 