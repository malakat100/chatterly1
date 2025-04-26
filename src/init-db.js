const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
    let connection;
    try {
        // First connect without database to create it if it doesn't exist
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('Connected to MySQL server');

        const dbName = process.env.DB_NAME || 'chat_site';

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        console.log('Database created or already exists');

        // Close the initial connection
        await connection.end();

        // Create a new connection with the database selected
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName
        });

        console.log(`Connected to database: ${dbName}`);

        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nickname VARCHAR(50) NOT NULL,
                age INT NOT NULL,
                sex VARCHAR(10) NOT NULL,
                gender VARCHAR(20) NOT NULL,
                location VARCHAR(100) NOT NULL,
                ip VARCHAR(45) NOT NULL,
                is_online BOOLEAN DEFAULT FALSE,
                is_banned BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('Users table created or already exists');

        // Create messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                content TEXT NOT NULL,
                is_reported BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            ) ENGINE=InnoDB;
        `);
        console.log('Messages table created or already exists');

        // Create admin_users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('Admin users table created or already exists');

        // Create indexes
        await connection.query('CREATE INDEX IF NOT EXISTS idx_users_ip ON users(ip)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_messages_reported ON messages(is_reported)');
        console.log('Indexes created or already exist');

        console.log('Database initialization completed successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
        process.exit();
    }
}

initializeDatabase(); 