const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chatterly',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Query function
async function query(sql, params) {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.query(sql, params);
        return results;
    } finally {
        connection.release();
    }
}

// Initialize database tables
async function initializeDatabase() {
    const connection = await pool.getConnection();
    try {
        // Create users table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nickname VARCHAR(255) NOT NULL,
                age INT NOT NULL,
                sex VARCHAR(50) NOT NULL,
                location VARCHAR(255) NOT NULL,
                ip VARCHAR(45) NOT NULL,
                is_online BOOLEAN DEFAULT false,
                is_admin BOOLEAN DEFAULT false,
                is_banned BOOLEAN DEFAULT false,
                password VARCHAR(255),
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add last_activity column if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('Added last_activity column to users table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding last_activity column:', error);
            }
        }

        // Add is_banned column if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN is_banned BOOLEAN DEFAULT false
            `);
            console.log('Added is_banned column to users table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding is_banned column:', error);
            }
        }

        // Add password column if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''
            `);
            console.log('Added password column to users table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding password column:', error);
            }
        }

        // Add is_admin column if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN is_admin BOOLEAN DEFAULT false
            `);
            console.log('Added is_admin column to users table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding is_admin column:', error);
            }
        }

        // Remove gender column if it exists
        try {
            await connection.query(`
                ALTER TABLE users 
                DROP COLUMN gender
            `);
            console.log('Removed gender column from users table');
        } catch (error) {
            if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.error('Error removing gender column:', error);
            }
        }

        // Create messages table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            )
        `);

        // Add is_read column to messages table if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE messages 
                ADD COLUMN is_read BOOLEAN DEFAULT false
            `);
            console.log('Added is_read column to messages table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding is_read column:', error);
            }
        }

        // Create user_reports table if it doesn't exist
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS user_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    reporter_id INT,
                    reported_id INT,
                    message_id INT,
                    reason TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT false,
                    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
                )
            `);
            console.log('Created user_reports table');
        } catch (error) {
            console.error('Error creating user_reports table:', error);
        }

        // Add message_id column to user_reports table if it doesn't exist
        try {
            await connection.query(`
                ALTER TABLE user_reports 
                ADD COLUMN message_id INT,
                ADD FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
            `);
            console.log('Added message_id column to user_reports table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.error('Error adding message_id column to user_reports table:', error);
            }
        }

        // Create admin_users table if it doesn't exist
        try {
            // First check if the table exists
            const [tables] = await connection.query(`
                SHOW TABLES LIKE 'admin_users'
            `);

            if (tables.length === 0) {
                // Create the table if it doesn't exist
                await connection.query(`
                    CREATE TABLE admin_users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL UNIQUE,
                        password VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('Created admin_users table');
            }

            // Check if password column exists
            const [columns] = await connection.query(`
                SHOW COLUMNS FROM admin_users LIKE 'password'
            `);

            if (columns.length === 0) {
                // Add password column if it doesn't exist
                await connection.query(`
                    ALTER TABLE admin_users
                    ADD COLUMN password VARCHAR(255) NOT NULL
                `);
                console.log('Added password column to admin_users table');
            }

            // Create admin user if it doesn't exist
            const [existingAdmin] = await connection.query(
                'SELECT * FROM admin_users WHERE username = ?',
                ['admin']
            );

            if (!existingAdmin) {
                // Hash the password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash('admin123', saltRounds);

                // Create admin user
                await connection.query(`
                    INSERT INTO admin_users (username, password)
                    VALUES (?, ?)
                `, ['admin', hashedPassword]);
                console.log('Admin user created successfully');
            } else {
                console.log('Admin user already exists');
            }
        } catch (error) {
            console.error('Error setting up admin_users:', error);
        }

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        connection.release();
    }
}

// Initialize database on startup
initializeDatabase();

module.exports = {
    query: async (sql, params) => {
        const connection = await pool.getConnection();
        try {
            const [results] = await connection.query(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
};