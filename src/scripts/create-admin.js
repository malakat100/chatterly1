const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdminUser() {
    try {
        const username = 'admin';
        const password = 'admin';
        
        // Check if admin user already exists
        const existingAdmin = await db.query('SELECT * FROM users WHERE nickname = ? AND is_admin = true', [username]);
        
        if (existingAdmin && existingAdmin.length > 0) {
            console.log('Admin user already exists');
            return;
        }
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create admin user
        const query = `
            INSERT INTO users (nickname, age, sex, location, ip, is_online, is_admin, password)
            VALUES (?, ?, ?, ?, ?, false, true, ?)
        `;
        
        const values = [username, 0, 'N/A', 'N/A', '127.0.0.1', hashedPassword];
        
        const result = await db.query(query, values);
        console.log('Admin user created successfully with ID:', result.insertId);
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        // Close the database connection
        process.exit();
    }
}

createAdminUser(); 