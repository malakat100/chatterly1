const { query } = require('../config/database');
const moment = require('moment');

async function cleanupInactiveUsers() {
    try {
        console.log('Starting database cleanup...');
        
        // Get current timestamp
        const now = moment();
        
        // First, get the count and IDs of users to be deleted
        const inactiveUsers = await query(`
            SELECT id
            FROM users 
            WHERE is_online = false 
            AND last_activity < DATE_SUB(NOW(), INTERVAL 1 HOUR)
            AND is_admin = false
        `);
        
        if (inactiveUsers.length === 0) {
            console.log('No inactive users found to delete');
            return;
        }
        
        console.log(`Found ${inactiveUsers.length} inactive users to delete`);
        
        // Get the user IDs
        const userIds = inactiveUsers.map(user => user.id);
        
        // Delete messages from these users first
        const messagesResult = await query(`
            DELETE FROM messages 
            WHERE sender_id IN (?) OR receiver_id IN (?)
        `, [userIds, userIds]);
        
        console.log(`Deleted ${messagesResult.affectedRows} messages from inactive users`);
        
        // Delete reports related to these users
        const reportsResult = await query(`
            DELETE FROM user_reports 
            WHERE reporter_id IN (?) OR reported_id IN (?)
        `, [userIds, userIds]);
        
        console.log(`Deleted ${reportsResult.affectedRows} reports from inactive users`);
        
        // Now delete the users
        const result = await query(`
            DELETE FROM users 
            WHERE id IN (?)
        `, [userIds]);
        
        console.log(`Deleted ${result.affectedRows} inactive users`);
        
        // Get final user count
        const finalCount = await query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
        console.log(`Remaining users in database: ${finalCount[0].count}`);
        
        console.log('Database cleanup completed successfully');
    } catch (error) {
        console.error('Database query error:', error);
        console.error('Error during database cleanup:', error.message);
    } finally {
        // Close the database connection
        process.exit();
    }
}

// Run the cleanup
cleanupInactiveUsers(); 