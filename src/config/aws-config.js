require('dotenv').config();

module.exports = {
    // AWS RDS Configuration
    rds: {
        host: process.env.RDS_HOSTNAME || process.env.DB_HOST || 'localhost',
        user: process.env.RDS_USERNAME || process.env.DB_USER || 'root',
        password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.RDS_DB_NAME || process.env.DB_NAME || 'chatterly',
        port: process.env.RDS_PORT || process.env.DB_PORT || 3306,
    },

    // AWS S3 Configuration (if needed for file uploads)
    s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET_NAME,
    },

    // Application Configuration
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
    },

    // AWS Elastic Beanstalk will provide these environment variables
    isAWS: process.env.AWS_EXECUTION_ENV ? true : false,
}; 