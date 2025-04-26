const db = require('../config/database');

class User {
    static async create({ nickname, age, sex, location, ip }) {
        const query = `
            INSERT INTO users (nickname, age, sex, location, ip, is_online, password)
            VALUES (?, ?, ?, ?, ?, true, '')
        `;
        const values = [nickname, age, sex, location, ip];
        
        try {
            console.log('Creating user with values:', values);
            const result = await db.query(query, values);
            console.log('Insert result:', result);
            
            // Get the inserted user's ID
            const userId = result.insertId;
            console.log('Inserted user ID:', userId);
            
            // Fetch the complete user data
            const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
            console.log('Fetched user:', user);
            
            if (!user) {
                throw new Error('Failed to fetch created user');
            }
            
            return user;
        } catch (error) {
            console.error('Error in create user:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            throw error;
        }
    }

    static async findByIp(ip) {
        const query = 'SELECT * FROM users WHERE ip = ?';
        const result = await db.query(query, [ip]);
        return result[0];
    }

    static async updateOnlineStatus(id, isOnline) {
        const query = 'UPDATE users SET is_online = ? WHERE id = ?';
        await db.query(query, [isOnline, id]);
        const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return result[0];
    }

    static async getAll() {
        const query = 'SELECT * FROM users ORDER BY created_at DESC';
        return await db.query(query);
    }

    static async banUser(userId) {
        const query = 'UPDATE users SET is_banned = true WHERE id = ?';
        await db.query(query, [userId]);
        const result = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        return result[0];
    }

    static async unbanUser(userId) {
        const query = 'UPDATE users SET is_banned = false WHERE id = ?';
        await db.query(query, [userId]);
        const result = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        return result[0];
    }

    static async reportUser(reporterId, reportedId, reason) {
        const query = `
            INSERT INTO user_reports (reporter_id, reported_id, reason)
            VALUES (?, ?, ?)
        `;
        const values = [reporterId, reportedId, reason];
        
        try {
            await db.query(query, values);
            return true;
        } catch (error) {
            console.error('Error reporting user:', error);
            throw error;
        }
    }

    static async getReportedUsers() {
        const query = `
            SELECT ur.*, u1.nickname as reporter_name, u2.nickname as reported_name
            FROM user_reports ur
            JOIN users u1 ON ur.reporter_id = u1.id
            JOIN users u2 ON ur.reported_id = u2.id
            ORDER BY ur.created_at DESC
        `;
        return await db.query(query);
    }
}

module.exports = User; 