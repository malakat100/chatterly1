const db = require('./database');

const testUsers = [
    { nickname: 'JohnDoe', age: 25, sex: 'male', location: 'New York, United States', ip: '192.168.1.1' },
    { nickname: 'JaneSmith', age: 30, sex: 'female', location: 'London, United Kingdom', ip: '192.168.1.2' },
    { nickname: 'MikeJohnson', age: 22, sex: 'male', location: 'Toronto, Canada', ip: '192.168.1.3' },
    { nickname: 'SarahWilliams', age: 28, sex: 'female', location: 'Sydney, Australia', ip: '192.168.1.4' },
    { nickname: 'DavidBrown', age: 35, sex: 'male', location: 'Dubai, United Arab Emirates', ip: '192.168.1.5' },
    { nickname: 'EmmaDavis', age: 27, sex: 'female', location: 'Berlin, Germany', ip: '192.168.1.6' },
    { nickname: 'RobertWilson', age: 31, sex: 'male', location: 'Paris, France', ip: '192.168.1.7' },
    { nickname: 'OliviaTaylor', age: 24, sex: 'female', location: 'Rome, Italy', ip: '192.168.1.8' },
    { nickname: 'JamesAnderson', age: 29, sex: 'male', location: 'Madrid, Spain', ip: '192.168.1.9' },
    { nickname: 'SophiaThomas', age: 26, sex: 'female', location: 'Tokyo, Japan', ip: '192.168.1.10' },
    { nickname: 'WilliamJackson', age: 33, sex: 'male', location: 'Beijing, China', ip: '192.168.1.11' },
    { nickname: 'IsabellaWhite', age: 23, sex: 'female', location: 'Moscow, Russia', ip: '192.168.1.12' },
    { nickname: 'MichaelHarris', age: 32, sex: 'male', location: 'Seoul, South Korea', ip: '192.168.1.13' },
    { nickname: 'MiaMartin', age: 25, sex: 'female', location: 'Mexico City, Mexico', ip: '192.168.1.14' },
    { nickname: 'DanielThompson', age: 28, sex: 'male', location: 'Amsterdam, Netherlands', ip: '192.168.1.15' },
    { nickname: 'CharlotteGarcia', age: 31, sex: 'female', location: 'Zurich, Switzerland', ip: '192.168.1.16' },
    { nickname: 'JosephMartinez', age: 27, sex: 'male', location: 'Stockholm, Sweden', ip: '192.168.1.17' },
    { nickname: 'AmeliaRobinson', age: 29, sex: 'female', location: 'Oslo, Norway', ip: '192.168.1.18' },
    { nickname: 'BenjaminClark', age: 34, sex: 'male', location: 'Copenhagen, Denmark', ip: '192.168.1.19' },
    { nickname: 'HarperRodriguez', age: 26, sex: 'female', location: 'Helsinki, Finland', ip: '192.168.1.20' }
];

async function insertTestUsers() {
    try {
        for (const user of testUsers) {
            await db.query(
                'INSERT INTO users (nickname, age, sex, location, ip, is_online, last_activity) VALUES (?, ?, ?, ?, ?, true, NOW())',
                [user.nickname, user.age, user.sex, user.location, user.ip]
            );
        }
        console.log('Test users inserted successfully');
    } catch (error) {
        console.error('Error inserting test users:', error);
    }
}

// Run the function
insertTestUsers(); 