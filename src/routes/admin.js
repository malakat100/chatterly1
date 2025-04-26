const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { query } = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const { addTestUsers } = require('../scripts/add-test-users');

// Apply isAdmin middleware to all routes
router.use(isAdmin);

// Get current user
router.get('/current-user', async (req, res) => {
    try {
        console.log('Checking admin status - Session:', req.session);
        if (!req.session.user || !req.session.user.is_admin) {
            console.log('Not authenticated or not admin');
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await query('SELECT * FROM admin_users WHERE id = ?', [req.session.user.id]);
        if (!user || user.length === 0) {
            console.log('Admin user not found in database');
            return res.status(404).json({ error: 'Admin user not found' });
        }

        console.log('Admin user found:', user[0]);
        res.json({
            id: user[0].id,
            username: user[0].username,
            is_admin: true
        });
    } catch (error) {
        console.error('Error getting current admin:', error);
        res.status(500).json({ error: 'Failed to get current admin' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        console.log('Admin users route - Session:', req.session);
        console.log('User in session:', req.session.user);
        
        if (!req.session.user || !req.session.user.is_admin) {
            console.log('Unauthorized access attempt to admin users');
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log('Fetching users for admin:', req.session.user.username);
        const users = await query(`
            SELECT id, nickname, age, location, is_online, is_banned, last_activity, sex
            FROM users
            ORDER BY is_online DESC, last_activity DESC
        `);
        
        console.log('Users fetched:', users);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Ban a user
router.post('/users/:id/ban', async (req, res) => {
    try {
        const userId = req.params.id;
        await query('UPDATE users SET is_banned = true WHERE id = ?', [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Unban a user
router.post('/users/:id/unban', async (req, res) => {
    try {
        const userId = req.params.id;
        await query('UPDATE users SET is_banned = false WHERE id = ?', [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Get all reports
router.get('/reports', async (req, res) => {
    try {
        console.log('Fetching reports...');
        const reports = await query(`
            SELECT 
                r.id,
                r.reporter_id,
                r.reported_id,
                r.message_id,
                r.reason as report_reason,
                r.resolved,
                r.created_at,
                reporter.nickname as reporter_nickname,
                reported.nickname as reported_nickname,
                reported.is_banned as reported_is_banned,
                m.content as message_content
            FROM user_reports r
            LEFT JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN users reported ON r.reported_id = reported.id
            LEFT JOIN messages m ON r.message_id = m.id
            ORDER BY r.created_at DESC
        `);
        console.log('Reports fetched:', reports);
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Get all messages for a specific user (admin view)
router.get('/messages/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Fetching messages for user:', userId);
        
        // Verify user exists first
        const userExists = await query('SELECT id FROM users WHERE id = ?', [userId]);
        if (!userExists || userExists.length === 0) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get all messages where the user is either sender or receiver
        // Include both participants' information for each message
        const messages = await query(`
            SELECT 
                m.*,
                sender.nickname as sender_nickname,
                receiver.nickname as receiver_nickname,
                sender.id as sender_id,
                receiver.id as receiver_id
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY m.created_at ASC
        `, [userId, userId]);

        console.log('Found messages:', messages.length);

        // Format messages with participant info
        const formattedMessages = messages.map(msg => ({
            ...msg,
            participants: {
                [msg.sender_id]: msg.sender_nickname,
                [msg.receiver_id]: msg.receiver_nickname
            }
        }));

        console.log('Formatted messages:', formattedMessages.length);
        res.json(formattedMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ 
            error: 'Failed to fetch messages',
            details: error.message,
            stack: error.stack
        });
    }
});

// Get a specific message
router.get('/messages/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        console.log('Fetching message with ID:', messageId);
        
        const message = await query('SELECT * FROM messages WHERE id = ?', [messageId]);
        console.log('Query result:', message);
        
        if (!message || message.length === 0) {
            console.log('Message not found');
            return res.status(404).json({ error: 'Message not found' });
        }
        
        console.log('Message found:', message[0]);
        res.json(message[0]);
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ error: 'Failed to fetch message', details: error.message });
    }
});

// Resolve a report
router.post('/reports/:id/resolve', async (req, res) => {
    try {
        const reportId = req.params.id;
        await query('UPDATE user_reports SET resolved = true WHERE id = ?', [reportId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error resolving report:', error);
        res.status(500).json({ error: 'Failed to resolve report' });
    }
});

// Get user statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_users,
                SUM(is_online) as online_users,
                SUM(is_banned) as banned_users,
                (SELECT COUNT(*) FROM user_reports WHERE resolved = false) as pending_reports
            FROM users
        `);
        
        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get all users for admin chat view
router.get('/chat/users', async (req, res) => {
    try {
        // Get all non-admin users with their online status and last activity
        const users = await query(`
            SELECT 
                id,
                nickname,
                age,
                is_online,
                last_activity,
                (SELECT COUNT(*) FROM messages WHERE sender_id = users.id OR receiver_id = users.id) as message_count
            FROM users
            WHERE is_admin = false
            ORDER BY 
                is_online DESC,
                last_activity DESC,
                message_count DESC
        `);

        res.json(users);
    } catch (error) {
        console.error('Error fetching users for chat:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get conversation between two specific users (admin view)
router.get('/messages/conversation/:user1Id/:user2Id', async (req, res) => {
    try {
        const { user1Id, user2Id } = req.params;
        
        // Get messages between these two users
        const messages = await query(`
            SELECT 
                m.*,
                sender.nickname as sender_nickname,
                receiver.nickname as receiver_nickname
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE 
                (m.sender_id = ? AND m.receiver_id = ?) OR
                (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        `, [user1Id, user2Id, user2Id, user1Id]);

        res.json(messages);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// Send a message as admin
router.post('/messages', isAdmin, async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
        
        if (!receiver_id || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert the message
        const result = await query(`
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES (?, ?, ?)
        `, [req.session.user.id, receiver_id, content]);

        // Get the inserted message with user details
        const message = await query(`
            SELECT m.*, 
                   s.nickname as sender_nickname,
                   r.nickname as receiver_nickname
            FROM messages m
            LEFT JOIN users s ON m.sender_id = s.id
            LEFT JOIN users r ON m.receiver_id = r.id
            WHERE m.id = ?
        `, [result.insertId]);

        // Emit the new message to the receiver
        req.app.get('io').to(`user_${receiver_id}`).emit('newMessage', message[0]);

        res.json(message[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Database cleanup route
router.post('/cleanup', async (req, res) => {
    try {
        console.log('Starting database cleanup...');
        
        // Get inactive users
        const inactiveUsers = await query(`
            SELECT id
            FROM users 
            WHERE is_online = false 
            AND last_activity < DATE_SUB(NOW(), INTERVAL 6 HOUR)
            AND is_admin = false
        `);
        
        if (inactiveUsers.length === 0) {
            return res.json({ 
                message: 'No inactive users found to delete',
                deletedUsers: 0,
                deletedMessages: 0,
                deletedReports: 0,
                remainingUsers: 0
            });
        }
        
        // Get the user IDs
        const userIds = inactiveUsers.map(user => user.id);
        
        // Delete messages from these users first
        const messagesResult = await query(`
            DELETE FROM messages 
            WHERE sender_id IN (?) OR receiver_id IN (?)
        `, [userIds, userIds]);
        
        // Delete reports related to these users
        const reportsResult = await query(`
            DELETE FROM user_reports 
            WHERE reporter_id IN (?) OR reported_id IN (?)
        `, [userIds, userIds]);
        
        // Now delete the users
        const result = await query(`
            DELETE FROM users 
            WHERE id IN (?)
        `, [userIds]);
        
        // Get final user count
        const finalCount = await query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
        
        res.json({
            message: 'Database cleanup completed successfully',
            deletedUsers: result.affectedRows,
            deletedMessages: messagesResult.affectedRows,
            deletedReports: reportsResult.affectedRows,
            remainingUsers: finalCount[0].count
        });
    } catch (error) {
        console.error('Database cleanup error:', error);
        res.status(500).json({ 
            error: 'Failed to cleanup database',
            details: error.message
        });
    }
});

// Add test users route
router.post('/add-test-users', isAdmin, async (req, res) => {
    try {
        await addTestUsers();
        res.json({ success: true, message: 'Test users added successfully' });
    } catch (error) {
        console.error('Error adding test users:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 