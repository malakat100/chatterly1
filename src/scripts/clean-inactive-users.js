const { query } = require('../config/database');

async function cleanInactiveUsers() {
    try {
        console.log('=== Cleaning Inactive Users ===\n');

        // First, clean up duplicate users (same nickname and IP)
        const [duplicateUsers] = await query(`
            SELECT nickname, ip, COUNT(*) as count 
            FROM users 
            GROUP BY nickname, ip 
            HAVING count > 1
        `);

        if (duplicateUsers.length > 0) {
            console.log(`Found ${duplicateUsers.length} sets of duplicate users`);
            
            for (const dup of duplicateUsers) {
                // Keep the most recent user and delete others
                const [usersToDelete] = await query(`
                    SELECT id, nickname, created_at 
                    FROM users 
                    WHERE nickname = ? AND ip = ?
                    ORDER BY created_at DESC
                    LIMIT 1, 1000
                `, [dup.nickname, dup.ip]);

                if (usersToDelete.length > 0) {
                    console.log(`\nDeleting ${usersToDelete.length} duplicate users for ${dup.nickname}:`);
                    usersToDelete.forEach(user => {
                        console.log(`- ID: ${user.id} (Created: ${user.created_at})`);
                    });

                    // First delete messages
                    await query(`
                        DELETE FROM messages 
                        WHERE sender_id IN (?) OR receiver_id IN (?)
                    `, [usersToDelete.map(u => u.id), usersToDelete.map(u => u.id)]);

                    // Then delete reports
                    await query(`
                        DELETE FROM user_reports 
                        WHERE reporter_id IN (?) OR reported_id IN (?)
                    `, [usersToDelete.map(u => u.id), usersToDelete.map(u => u.id)]);

                    // Finally delete users
                    const deleteResult = await query(`
                        DELETE FROM users 
                        WHERE id IN (?)
                    `, [usersToDelete.map(u => u.id)]);

                    console.log(`Deleted ${deleteResult.affectedRows} duplicate users`);
                }
            }
        }

        // Now clean up inactive users (not online and not admin)
        const [inactiveUsers] = await query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE is_online = 0 
            AND is_admin = 0
        `);

        console.log(`\nFound ${inactiveUsers.count} inactive users to delete`);

        if (inactiveUsers.count > 0) {
            // Get details of users to be deleted
            const usersToDelete = await query(`
                SELECT id, nickname, last_activity 
                FROM users 
                WHERE is_online = 0 
                AND is_admin = 0
                ORDER BY last_activity DESC
            `);

            console.log('\nUsers to be deleted:');
            usersToDelete.forEach(user => {
                console.log(`- ${user.nickname} (ID: ${user.id}) - Last active: ${user.last_activity}`);
            });

            // First delete messages
            await query(`
                DELETE FROM messages 
                WHERE sender_id IN (
                    SELECT id FROM users 
                    WHERE is_online = 0 
                    AND is_admin = 0
                ) 
                OR receiver_id IN (
                    SELECT id FROM users 
                    WHERE is_online = 0 
                    AND is_admin = 0
                )
            `);

            // Then delete reports
            await query(`
                DELETE FROM user_reports 
                WHERE reporter_id IN (
                    SELECT id FROM users 
                    WHERE is_online = 0 
                    AND is_admin = 0
                ) 
                OR reported_id IN (
                    SELECT id FROM users 
                    WHERE is_online = 0 
                    AND is_admin = 0
                )
            `);

            // Finally delete users
            const result = await query(`
                DELETE FROM users 
                WHERE is_online = 0 
                AND is_admin = 0
            `);

            console.log(`\nSuccessfully deleted ${result.affectedRows} inactive users`);
        } else {
            console.log('No inactive users found to delete');
        }

        // Show remaining users
        const [remainingUsers] = await query(`
            SELECT COUNT(*) as count 
            FROM users
        `);
        console.log(`\nTotal users remaining: ${remainingUsers.count}`);

    } catch (error) {
        console.error('Error cleaning inactive users:', error);
    } finally {
        process.exit();
    }
}

cleanInactiveUsers(); 