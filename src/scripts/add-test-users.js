const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const testUsers = [
    {
        nickname: 'CosmicWanderer',
        age: 25,
        sex: 'male',
        location: 'New York, USA',
        ip: '127.0.0.1',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'PixelDreamer',
        age: 28,
        sex: 'female',
        location: 'London, UK',
        ip: '127.0.0.2',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'QuantumWhisper',
        age: 32,
        sex: 'male',
        location: 'Tokyo, Japan',
        ip: '127.0.0.3',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'StarlightSoul',
        age: 24,
        sex: 'female',
        location: 'Paris, France',
        ip: '127.0.0.4',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'MysticRiver',
        age: 29,
        sex: 'male',
        location: 'Berlin, Germany',
        ip: '127.0.0.5',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'EchoOfSilence',
        age: 27,
        sex: 'female',
        location: 'Sydney, Australia',
        ip: '127.0.0.6',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'FrostPhoenix',
        age: 31,
        sex: 'male',
        location: 'Toronto, Canada',
        ip: '127.0.0.7',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'MoonlitDancer',
        age: 26,
        sex: 'female',
        location: 'Singapore',
        ip: '127.0.0.8',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'StormChaser',
        age: 33,
        sex: 'male',
        location: 'Dubai, UAE',
        ip: '127.0.0.9',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'CrystalHeart',
        age: 28,
        sex: 'female',
        location: 'Mumbai, India',
        ip: '127.0.0.10',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'ShadowWalker',
        age: 30,
        sex: 'male',
        location: 'São Paulo, Brazil',
        ip: '127.0.0.11',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'RainbowSpirit',
        age: 25,
        sex: 'female',
        location: 'Amsterdam, Netherlands',
        ip: '127.0.0.12',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'ThunderBolt',
        age: 29,
        sex: 'male',
        location: 'Seoul, South Korea',
        ip: '127.0.0.13',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'DesertRose',
        age: 27,
        sex: 'female',
        location: 'Cairo, Egypt',
        ip: '127.0.0.14',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'OceanDreamer',
        age: 34,
        sex: 'male',
        location: 'Mexico City, Mexico',
        ip: '127.0.0.15',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'AuroraBorealis',
        age: 26,
        sex: 'female',
        location: 'Stockholm, Sweden',
        ip: '127.0.0.16',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'MountainSpirit',
        age: 31,
        sex: 'male',
        location: 'Vienna, Austria',
        ip: '127.0.0.17',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'SunsetGlow',
        age: 28,
        sex: 'female',
        location: 'Bangkok, Thailand',
        ip: '127.0.0.18',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'WindWhisper',
        age: 32,
        sex: 'male',
        location: 'Copenhagen, Denmark',
        ip: '127.0.0.19',
        password: 'password123',
        is_banned: false
    },
    {
        nickname: 'NorthernLight',
        age: 29,
        sex: 'female',
        location: 'Helsinki, Finland',
        ip: '127.0.0.20',
        password: 'password123',
        is_banned: false
    }
];

async function addTestUsers() {
    try {
        for (const user of testUsers) {
            // Check if user already exists
            const existingUser = await query(
                'SELECT * FROM users WHERE nickname = ?',
                [user.nickname]
            );

            if (existingUser.length > 0) {
                console.log(`User ${user.nickname} already exists, updating online status...`);
                // Update existing user's online status
                await query(
                    'UPDATE users SET is_online = 1, last_activity = CURRENT_TIMESTAMP WHERE nickname = ?',
                    [user.nickname]
                );
                continue;
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(user.password, 10);

            // Insert the user with is_online set to 1
            await query(
                'INSERT INTO users (nickname, password, age, sex, location, ip, is_online, is_admin, is_banned, last_activity) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)',
                [user.nickname, hashedPassword, user.age, user.sex, user.location, user.ip, user.is_banned]
            );

            console.log(`Added test user: ${user.nickname}`);
        }

        console.log('All test users added successfully');
    } catch (error) {
        console.error('Error adding test users:', error);
        throw error;
    }
}

// If this file is run directly (not imported as a module)
if (require.main === module) {
    addTestUsers()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Failed to add test users:', error);
            process.exit(1);
        });
}

module.exports = { addTestUsers }; 