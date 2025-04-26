const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    let connection;
    try {
        console.log('Attempting to connect to database...');
        console.log('Using configuration:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME
        });

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'chat_site'
        });

        console.log('Successfully connected to MySQL!');

        // Test the connection by executing a simple query
        const [rows] = await connection.execute('SELECT 1 + 1 AS result');
        console.log('Test query result:', rows[0]);

        // Try to create the database if it doesn't exist
        try {
            await connection.execute('CREATE DATABASE IF NOT EXISTS chat_site');
            console.log('Database chat_site exists or was created successfully');
        } catch (err) {
            console.error('Error creating database:', err);
        }

    } catch (error) {
        console.error('Error connecting to MySQL:', error);
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist. Please create it first.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Access denied. Please check your username and password.');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
        process.exit();
    }
}

testConnection(); 