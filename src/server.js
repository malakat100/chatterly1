const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

// Import models and database
const Message = require('./models/message');
const User = require('./models/user');
const db = require('./config/database');

// Session configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);

// Add request logging middleware
app.use((req, res, next) => {
    console.log('Incoming request:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
    });
    next();
});

// Socket.IO configuration
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
});

// Share session between Express and Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Handle socket connection errors
io.engine.on("connection_error", (err) => {
    console.error('Socket.IO connection error:', err);
});

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Routes
app.use('/api', authRoutes);

// Admin login route (must be before isAdmin middleware)
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt - Username:', username);
        console.log('Login attempt - Password provided:', password);
        
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Check if admin user exists
        const query = 'SELECT * FROM admin_users WHERE username = ?';
        const [admin] = await db.query(query, [username]);
        console.log('Admin query result:', JSON.stringify(admin, null, 2));
        
        if (!admin) {
            console.log('Admin user not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('Admin found, verifying password...');
        console.log('Stored password hash:', admin.password);
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        console.log('Password verification result:', isValidPassword);
        
        if (!isValidPassword) {
            console.log('Invalid password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create admin session
        req.session.user = {
            id: admin.id,
            username: admin.username,
            is_admin: true
        };
        
        console.log('Admin login successful, session created:', req.session.user);
        return res.json({ 
            success: true,
            message: 'Login successful',
            user: {
                id: admin.id,
                username: admin.username,
                is_admin: true
            }
        });
        
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ 
            error: 'Login failed',
            details: error.message 
        });
    }
});

// Admin middleware
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.is_admin) {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
};

// Admin routes
app.use('/api/admin', adminRoutes);

// Add conversation route
app.get('/api/conversation/:userId', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const messages = await Message.getConversation(req.session.user.id, req.params.userId);
        res.json(messages);
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({ error: 'Failed to get conversation' });
    }
});

// Add inbox route
app.get('/api/inbox', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get all conversations for the user
        const query = `
            SELECT DISTINCT 
                CASE 
                    WHEN sender_id = ? THEN receiver_id 
                    ELSE sender_id 
                END as user_id,
                u.nickname,
                MAX(m.created_at) as last_message_time,
                (
                    SELECT content 
                    FROM messages 
                    WHERE (sender_id = ? AND receiver_id = u.id) 
                    OR (sender_id = u.id AND receiver_id = ?)
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) as last_message,
                COALESCE(
                    (
                        SELECT COUNT(*) 
                        FROM messages 
                        WHERE sender_id = u.id 
                        AND receiver_id = ? 
                        AND (is_read = false OR is_read IS NULL)
                    ), 0
                ) as unread_count
            FROM messages m
            JOIN users u ON (
                CASE 
                    WHEN m.sender_id = ? THEN m.receiver_id 
                    ELSE m.sender_id 
                END = u.id
            )
            WHERE sender_id = ? OR receiver_id = ?
            GROUP BY user_id, u.nickname
            ORDER BY last_message_time DESC
        `;
        const values = [
            req.session.user.id,
            req.session.user.id,
            req.session.user.id,
            req.session.user.id,
            req.session.user.id,
            req.session.user.id,
            req.session.user.id
        ];
        const conversations = await db.query(query, values);
        
        res.json(conversations);
    } catch (error) {
        console.error('Error getting inbox:', error);
        res.status(500).json({ error: 'Failed to get inbox' });
    }
});

// Add report user route
app.post('/api/report-user', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { reportedId, reason } = req.body;
        if (!reportedId || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await User.reportUser(req.session.user.id, reportedId, reason);
        res.json({ message: 'User reported successfully' });
    } catch (error) {
        console.error('Error reporting user:', error);
        res.status(500).json({ error: 'Failed to report user' });
    }
});

// Mark messages as read
app.post('/api/mark-read/:userId', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const query = `
            UPDATE messages 
            SET is_read = true 
            WHERE sender_id = ? 
            AND receiver_id = ? 
            AND is_read = false
        `;
        await db.query(query, [req.params.userId, req.session.user.id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { nickname, password } = req.body;
        const user = await User.authenticate(nickname, password);
        
        if (user) {
            // Mark user as online
            await db.query('UPDATE users SET is_online = true WHERE id = ?', [user.id]);
            console.log(`User ${user.nickname} logged in and marked as online`);
            
            req.session.user = {
                id: user.id,
                nickname: user.nickname,
                is_admin: user.is_admin
            };
            
            // Get all online users and send to all clients
            const onlineUsers = await getOnlineUsers(user.id);
            console.log('Updated online users list after login:', onlineUsers);
            io.emit('online_users', onlineUsers);
            
            res.json({ success: true, user: req.session.user });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout route
app.post('/api/logout', async (req, res) => {
    try {
        console.log('Logout attempt - Session:', req.session);
        
        if (req.session.user) {
            // If it's an admin user, update admin_users table
            if (req.session.user.is_admin) {
                await db.query('UPDATE admin_users SET is_online = false WHERE id = ?', [req.session.user.id]);
                console.log('Admin user logged out:', req.session.user.username);
            } else {
                // Regular user logout
                await db.query('UPDATE users SET is_online = false WHERE id = ?', [req.session.user.id]);
                console.log('User logged out:', req.session.user.nickname);
            }
        }
        
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }
            console.log('Session destroyed successfully');
            res.json({ success: true });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/chat', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

// Serve admin pages
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) {
        return res.redirect('/admin-login');
    }
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Serve static pages
app.get('/pages/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'privacy.html'));
});

app.get('/pages/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'terms.html'));
});

app.get('/pages/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'contact.html'));
});

app.get('/pages/safety', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'safety.html'));
});

// Add a route to check admin status
app.get('/api/admin/check', (req, res) => {
    console.log('Checking admin status - Session:', req.session);
    if (req.session.user && req.session.user.is_admin) {
        res.json({ isAdmin: true });
    } else {
        res.json({ isAdmin: false });
    }
});

// Admin routes
app.get('/api/admin/users', async (req, res) => {
    try {
        console.log('Admin users route - Session:', req.session);
        
        if (!req.session.user || !req.session.user.is_admin) {
            console.log('Unauthorized access attempt to admin users');
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log('Fetching users for admin:', req.session.user.username);
        const users = await db.query(`
            SELECT id, nickname, age, location, is_banned, is_online, last_activity, sex
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

app.get('/api/admin/reports', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.is_admin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const reports = await db.query(`
            SELECT r.*, 
                   reporter.nickname as reporter_nickname,
                   reported.nickname as reported_nickname
            FROM user_reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            JOIN users reported ON r.reported_id = reported.id
            ORDER BY r.created_at DESC
        `);
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

app.post('/api/admin/ban/:userId', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.is_admin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        console.log(`Attempting to ban user ${userId}`);
        
        // Update user's banned status and set offline
        const result = await db.query('UPDATE users SET is_banned = true, is_online = false WHERE id = ?', [userId]);
        console.log('Ban update result:', result);
        
        // Find and disconnect the user's socket if they're connected
        const userSocket = Array.from(io.sockets.sockets.values())
            .find(socket => socket.userId === parseInt(userId));
            
        if (userSocket) {
            console.log(`Found socket for user ${userId}, sending ban notification and disconnecting...`);
            // Send ban notification to the user
            userSocket.emit('banned', { message: 'You have been banned from the chat.' });
            // Give a small delay to ensure the message is sent before disconnecting
            setTimeout(() => {
                userSocket.disconnect();
                console.log(`Disconnected banned user ${userId}`);
            }, 1000);
        } else {
            console.log(`No active socket found for user ${userId}`);
        }

        // Get updated online users list and send to all clients
        const onlineUsers = await getOnlineUsers(req.session.user.id);
        console.log('Updated online users after ban:', onlineUsers);
        io.emit('online_users', onlineUsers);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

app.post('/api/admin/unban/:userId', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.is_admin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await db.query('UPDATE users SET is_banned = false WHERE id = ?', [req.params.userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Reset all users' online status when server starts
async function resetAllUsersOnlineStatus() {
    try {
        await db.query('UPDATE users SET is_online = false');
        console.log('Reset all users online status to offline');
    } catch (error) {
        console.error('Error resetting users online status:', error);
    }
}

// Call the reset function when server starts
resetAllUsersOnlineStatus();

// Handle socket connection
io.on('connection', async (socket) => {
    console.log('New client connected');
    
    // Get user from session
    const user = socket.request.session.user;
    console.log('Socket connection - User session:', user);
    
    if (!user) {
        console.log('No user session found, disconnecting socket');
        socket.disconnect();
        return;
    }

    // Set user data on socket
    socket.userId = user.id;
    socket.join(user.id);
    console.log(`User ${user.nickname} (${user.id}) joined socket room`);

    try {
        // Mark user as online
        await db.query('UPDATE users SET is_online = true, last_activity = NOW() WHERE id = ?', [user.id]);
        console.log(`User ${user.nickname} (${user.id}) marked as online`);
        
        // Get all online users and send to all clients
        const onlineUsers = await getOnlineUsers(user.id);
        console.log('Updated online users list:', onlineUsers);
        io.emit('online_users', onlineUsers);
        console.log('Emitted online_users event to all clients');
    } catch (error) {
        console.error('Error updating user status:', error);
    }

    // Handle private messages
    socket.on('private message', async (data) => {
        try {
            console.log('Received private message:', data);
            
            // Save message to database
            const message = await Message.create(user.id, data.to, data.message);
            
            // Send message to receiver if they're online
            const receiverSocket = Array.from(io.sockets.sockets.values())
                .find(s => s.userId === data.to);
                
            if (receiverSocket) {
                receiverSocket.emit('private message', {
                    from: user.id,
                    message: data.message
                });
            }
        } catch (error) {
            console.error('Error handling private message:', error);
        }
    });

    // Handle socket disconnection
    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.userId);
        try {
            // Update user status to offline
            await db.query('UPDATE users SET is_online = false WHERE id = ?', [socket.userId]);
            console.log(`User ${socket.userId} marked as offline`);
            
            // Get updated online users list and send to all clients
            const onlineUsers = await getOnlineUsers(socket.userId);
            console.log('Updated online users list after disconnect:', onlineUsers);
            io.emit('online_users', onlineUsers);
        } catch (error) {
            console.error('Error updating user status on disconnect:', error);
        }
    });

    // Handle search users event
    socket.on('searchUsers', async (filters) => {
        try {
            console.log('Searching users with filters:', filters);
            
            let query = `
                SELECT id, nickname, age, sex, location, is_online
                FROM users
                WHERE is_online = true
            `;
            const params = [];
            
            // Add nickname filter
            if (filters.nickname) {
                query += ` AND nickname LIKE ?`;
                params.push(`%${filters.nickname}%`);
            }
            
            // Add sex filter
            if (filters.sex) {
                query += ` AND sex = ?`;
                params.push(filters.sex);
            }
            
            // Add country filter
            if (filters.country) {
                query += ` AND location LIKE ?`;
                params.push(`%${filters.country}%`);
            }
            
            // Add age range filter
            if (filters.minAge) {
                query += ` AND age >= ?`;
                params.push(parseInt(filters.minAge));
            }
            if (filters.maxAge) {
                query += ` AND age <= ?`;
                params.push(parseInt(filters.maxAge));
            }
            
            // Order by last activity
            query += ` ORDER BY last_activity DESC`;
            
            const users = await db.query(query, params);
            console.log('Search results:', users);
            
            socket.emit('searchResults', users);
        } catch (error) {
            console.error('Error searching users:', error);
            socket.emit('searchResults', []);
        }
    });
});

// Helper function to get online users
async function getOnlineUsers(currentUserId) {
    try {
        console.log(`Fetching online users (excluding user ${currentUserId})`);
        const users = await db.query(`
            SELECT id, nickname, is_online, sex, age, location
            FROM users 
            WHERE is_online = true
            AND id != ?  -- Exclude the current user
            AND is_banned = false  -- Exclude banned users
            AND last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)  -- Only show users active in last 5 minutes
        `, [currentUserId]);
        console.log('Fetched online users:', users);
        return users;
    } catch (error) {
        console.error('Error getting online users:', error);
        return [];
    }
}

// Get current user
app.get('/api/admin/current-user', (req, res) => {
    console.log('Checking admin status - Session:', req.session);
    if (req.session.user && req.session.user.is_admin) {
        res.json({
            id: req.session.user.id,
            username: req.session.user.username,
            is_admin: true
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Admin cleanup endpoint
app.post('/api/admin/cleanup', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.is_admin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log('Starting database cleanup...');
        
        // Get inactive users
        const inactiveUsers = await db.query(`
            SELECT id
            FROM users 
            WHERE is_online = false 
            AND last_activity < DATE_SUB(NOW(), INTERVAL 1 HOUR)
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
        const messagesResult = await db.query(`
            DELETE FROM messages 
            WHERE sender_id IN (?) OR receiver_id IN (?)
        `, [userIds, userIds]);
        
        // Delete reports related to these users
        const reportsResult = await db.query(`
            DELETE FROM user_reports 
            WHERE reporter_id IN (?) OR reported_id IN (?)
        `, [userIds, userIds]);
        
        // Now delete the users
        const result = await db.query(`
            DELETE FROM users 
            WHERE id IN (?)
        `, [userIds]);
        
        // Get final user count
        const finalCount = await db.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
        
        res.json({
            message: 'Database cleanup completed successfully',
            deletedUsers: result.affectedRows,
            deletedMessages: messagesResult.affectedRows,
            deletedReports: reportsResult.affectedRows,
            remainingUsers: finalCount[0].count
        });
    } catch (error) {
        console.error('Database cleanup error:', error);
        res.status(500).json({ error: 'Failed to cleanup database' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 