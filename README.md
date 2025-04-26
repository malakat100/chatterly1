# Chatterly

A real-time chat application with user management and moderation features.

## AWS Deployment Guide

### Option 1: EC2 Deployment

#### Prerequisites

1. AWS Account with EC2 access
2. SSH key pair for EC2 instance access
3. MySQL installed on EC2 or RDS instance
4. Node.js 16 or higher
5. PM2 for process management

#### EC2 Setup Steps

1. Launch an EC2 instance:
   - Use Ubuntu Server 20.04 LTS or newer
   - t2.micro (free tier) or larger
   - Configure security group to allow:
     - HTTP (80)
     - HTTPS (443)
     - SSH (22)
     - WebSocket (8081)

2. Connect to your EC2 instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-dns
   ```

3. Install required packages:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm mysql-server nginx
   ```

4. Install PM2 globally:
   ```bash
   sudo npm install -g pm2
   ```

5. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chatterly.git
   cd chatterly
   ```

6. Install dependencies:
   ```bash
   npm install
   ```

7. Set up environment variables:
   ```bash
   cp .env.example .env
   nano .env
   ```

8. Configure Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/chatterly
   ```
   
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8081;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

9. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/chatterly /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. Start the application with PM2:
    ```bash
    pm2 start src/server.js --name chatterly
    pm2 startup
    pm2 save
    ```

11. Set up SSL with Let's Encrypt:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

### Updating the Application

When you've made changes to the application and pushed them to GitHub, follow these steps to update your EC2 instance:

1. SSH into your EC2 instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-dns
   ```

2. Navigate to your application directory:
   ```bash
   cd chatterly
   ```

3. Pull the latest changes from GitHub:
   ```bash
   git pull origin main  # or your branch name
   ```

4. Install any new dependencies:
   ```bash
   npm install
   ```

5. If there are database changes, run any necessary migration scripts:
   ```bash
   node src/scripts/check-table-structure.js  # Check for required table changes
   ```

6. Restart the application:
   ```bash
   pm2 restart chatterly
   ```

7. Check the application logs for any errors:
   ```bash
   pm2 logs chatterly
   ```

8. Verify the application is running correctly:
   ```bash
   pm2 status
   ```

#### Rollback Procedure

If you encounter issues after updating, you can rollback to the previous version:

1. Check out the previous commit:
   ```bash
   git log  # Find the previous commit hash
   git checkout <previous-commit-hash>
   ```

2. Install dependencies for the previous version:
   ```bash
   npm install
   ```

3. Restart the application:
   ```bash
   pm2 restart chatterly
   ```

4. Verify the application is running:
   ```bash
   pm2 logs chatterly
   ```

#### Maintenance Commands

1. View application logs:
   ```bash
   pm2 logs chatterly
   ```

2. Restart application:
   ```bash
   pm2 restart chatterly
   ```

3. Update application:
   ```bash
   git pull
   npm install
   pm2 restart chatterly
   ```

### Option 2: Elastic Beanstalk Deployment

### Prerequisites

1. Install AWS CLI and configure it with your credentials
2. Install Elastic Beanstalk CLI: `npm install -g aws-elastic-beanstalk-cli`
3. Create an RDS MySQL instance in AWS
4. (Optional) Create an ElastiCache Redis instance for session management

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application
NODE_ENV=production
PORT=8081
SESSION_SECRET=your-strong-session-secret

# AWS RDS Database
RDS_HOSTNAME=your-rds-endpoint.region.rds.amazonaws.com
RDS_USERNAME=your_db_username
RDS_PASSWORD=your_db_password
RDS_DB_NAME=chatterly
RDS_PORT=3306

# AWS S3 (if needed for file uploads)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Redis Session Store (Optional)
REDIS_HOST=your-redis-endpoint
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Logging
LOG_LEVEL=info
```

### Database Setup

1. Create an RDS MySQL instance in AWS
2. Connect to your RDS instance using a MySQL client
3. Run the schema file to set up the database:
   ```bash
   mysql -h your-rds-endpoint -u your_username -p < src/config/schema.sql
   ```

### Creating Admin User

1. After setting up your database and environment variables, run the admin creation script:
   ```bash
   node src/scripts/create-admin.js
   ```

   This will create an admin user with the following default credentials:
   - Username: admin
   - Password: admin

   **Important**: Change the admin password immediately after first login for security.

2. To verify the admin user was created, you can check the database:
   ```sql
   SELECT id, nickname, is_admin FROM users WHERE is_admin = true;
   ```

3. To reset the admin password if needed, use:
   ```bash
   node src/scripts/reset-admin-password.js
   ```

### Deployment Steps

1. Initialize Elastic Beanstalk in your project:
   ```bash
   eb init
   ```

2. Create a new environment:
   ```bash
   npm run create-eb
   ```

3. Deploy your application:
   ```bash
   npm run deploy
   ```

4. Check deployment status:
   ```bash
   npm run status
   ```

5. View logs:
   ```bash
   npm run logs
   ```

### Important Notes

1. The application uses WebSocket connections, so make sure your AWS security groups allow WebSocket traffic
2. Configure your Elastic Beanstalk environment to use Node.js 16 or higher
3. Set up proper monitoring and alerts in AWS CloudWatch
4. Enable auto-scaling if needed
5. Set up a custom domain and SSL certificate through AWS Certificate Manager

### Security Considerations

1. Always use environment variables for sensitive information
2. Enable AWS WAF for additional security
3. Regularly update dependencies and apply security patches
4. Monitor AWS CloudWatch logs for suspicious activities
5. Set up proper backup strategies for your RDS instance

### Maintenance

1. Regular database cleanup:
   ```bash
   npm run cleanup
   ```

2. View database status:
   ```bash
   npm run view-db
   ```

3. Clean inactive users:
   ```bash
   npm run clean-users
   ```

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up local environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- Real-time chat using Socket.IO
- User authentication and authorization
- Admin dashboard for user management
- User reporting system
- Automatic cleanup of inactive users
- Message history
- Online/offline status tracking
- User search with filters
- Responsive design
- Security features (password hashing, session management)

## Scaling and Performance

### Concurrent User Capacity

The application can handle:
- Up to 10,000 concurrent WebSocket connections per server instance
- Real-time messaging with minimal latency
- Efficient user search and filtering
- Automatic cleanup of inactive users to maintain performance

### Scaling Options

1. **Vertical Scaling**
   - Increase server resources (CPU, RAM)
   - Upgrade database instance
   - Optimize MySQL configuration

2. **Horizontal Scaling**
   - Deploy multiple application instances behind a load balancer
   - Use Redis for session management and pub/sub
   - Implement database replication
   - Configure Socket.IO with Redis adapter for multi-server support

### Performance Optimization

1. **Database**
   - Regular cleanup of inactive users
   - Optimized queries with proper indexing
   - Connection pooling
   - Query caching where appropriate

2. **Application**
   - PM2 clustering for multi-core utilization
   - Nginx load balancing and caching
   - WebSocket connection optimization
   - Regular garbage collection

3. **Monitoring**
   - PM2 monitoring for application metrics
   - MySQL performance monitoring
   - WebSocket connection tracking
   - Server resource utilization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License. 