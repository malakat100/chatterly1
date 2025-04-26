const db = require('../config/database');

class Message {
    static async create(senderId, receiverId, content) {
        const query = `
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES (?, ?, ?)
        `;
        const values = [senderId, receiverId, content];
        
        try {
            await db.query(query, values);
            return true;
        } catch (error) {
            console.error('Error creating message:', error);
            throw error;
        }
    }

    static async getConversation(userId1, userId2) {
        const query = `
            SELECT * FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC
        `;
        const values = [userId1, userId2, userId2, userId1];
        
        try {
            const messages = await db.query(query, values);
            return messages;
        } catch (error) {
            console.error('Error getting conversation:', error);
            throw error;
        }
    }

    static async reportMessage(message_id) {
        const query = 'UPDATE messages SET is_reported = true WHERE id = $1 RETURNING *';
        const result = await db.query(query, [message_id]);
        return result.rows[0];
    }

    static async getReportedMessages() {
        const query = `
            SELECT m.*, u1.nickname as sender_name, u2.nickname as receiver_name
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            WHERE m.is_reported = true
            ORDER BY m.created_at DESC;
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = Message; 