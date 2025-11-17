# Premium Gift Box - Deployment Guide

## Production Deployment Checklist

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Domain name (optional but recommended)
- SSL certificate (for HTTPS)
- SMTP server credentials
- WhatsApp Business API access (optional)

## Step 1: Server Setup

### Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Clone and Setup Project
```bash
# Clone repository
git clone <repository-url>
cd MobileApp/backend

# Install dependencies
npm install --production

# Create necessary directories
mkdir -p data uploads backups
mkdir -p uploads/files uploads/images uploads/pdfs uploads/excel
```

## Step 2: Environment Configuration

Create `.env` file:
```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Security - CHANGE THESE!
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Database
DATABASE_PATH=./data/premiumgiftbox.db

# WhatsApp Business API (Optional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

# Email/SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@premiumgiftbox.com

# Backup Configuration
AUTO_BACKUP=true
BACKUP_FREQUENCY=4
MAX_BACKUPS=10
BACKUP_DIR=./backups

# Features
ENABLE_NOTIFICATIONS=true
ENABLE_WHATSAPP=false
ENABLE_EMAIL=true
ENABLE_ANALYTICS=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

## Step 3: Database Initialization

```bash
# Initialize database with schema
node src/database/init.js

# Verify database creation
ls -lh data/premiumgiftbox.db
```

## Step 4: Security Hardening

### Change Default Admin Password
```bash
# Login with default credentials
# Username: admin
# Password: admin123

# Then immediately change password via API
curl -X PUT http://localhost:3000/api/auth/password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"admin123","newPassword":"your-secure-password"}'
```

### Set Strong JWT Secret
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env file with generated secret
```

### File Permissions
```bash
# Secure data directory
chmod 750 data
chmod 640 data/premiumgiftbox.db

# Secure uploads directory
chmod 750 uploads
chmod 640 uploads/*

# Secure environment file
chmod 600 .env
```

## Step 5: Process Management with PM2

### Install PM2
```bash
npm install -g pm2
```

### Create PM2 Ecosystem File
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'premium-gift-box',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
};
```

### Start Application
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs premium-gift-box

# Configure PM2 to start on system boot
pm2 startup
pm2 save
```

## Step 6: Nginx Reverse Proxy (Recommended)

### Install Nginx
```bash
sudo apt-get update
sudo apt-get install nginx
```

### Configure Nginx
Create `/etc/nginx/sites-available/premium-gift-box`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logging
    access_log /var/log/nginx/premium-gift-box-access.log;
    error_log /var/log/nginx/premium-gift-box-error.log;

    # Client body size (for file uploads)
    client_max_body_size 20M;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files
    location /uploads/ {
        alias /path/to/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/premium-gift-box /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

## Step 8: Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 9: Monitoring & Logging

### Setup Log Rotation
Create `/etc/logrotate.d/premium-gift-box`:
```
/path/to/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

### Monitor with PM2
```bash
# Monitor in real-time
pm2 monit

# Web-based monitoring (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## Step 10: Backup Strategy

### Automated Database Backups
Backups are created automatically every 4 hours (configurable).

### Manual Backup Script
Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/path/to/data/premiumgiftbox.db"

# Create backup
cp "$DB_PATH" "$BACKUP_DIR/manual_backup_$DATE.db"

# Compress
gzip "$BACKUP_DIR/manual_backup_$DATE.db"

# Keep only last 30 backups
ls -t $BACKUP_DIR/manual_backup_*.db.gz | tail -n +31 | xargs -r rm

echo "Backup completed: manual_backup_$DATE.db.gz"
```

### Schedule with Cron
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /path/to/logs/backup.log 2>&1
```

## Step 11: WhatsApp Business API Setup (Optional)

1. Create Facebook Business Account
2. Set up WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Configure webhook URL: `https://your-domain.com/api/communication/whatsapp/webhook`
5. Add credentials to `.env` file

## Step 12: Email Configuration

### Gmail Configuration
1. Enable 2-factor authentication
2. Create App Password
3. Use App Password in SMTP_PASS

### Custom SMTP Server
Update `.env` with your SMTP details:
```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
```

## Step 13: Health Checks

### API Health Check
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Setup Uptime Monitoring
Use services like:
- UptimeRobot
- Pingdom
- StatusCake

Configure alerts for downtime.

## Step 14: Performance Tuning

### Database Optimization
```bash
# Run VACUUM periodically
sqlite3 data/premiumgiftbox.db "VACUUM;"

# Analyze query performance
sqlite3 data/premiumgiftbox.db "ANALYZE;"
```

### Node.js Optimization
Update `ecosystem.config.js`:
```javascript
env: {
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-old-space-size=2048'
}
```

## Maintenance Tasks

### Daily
- Monitor PM2 logs
- Check disk space
- Verify backup creation

### Weekly
- Review audit logs
- Check failed webhook deliveries
- Clean up old communication logs

### Monthly
- Update dependencies: `npm update`
- Review security advisories
- Database vacuum and analyze
- Test backup restoration

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs premium-gift-box --lines 100

# Check for port conflicts
sudo lsof -i :3000

# Verify environment variables
pm2 env 0
```

### Database Issues
```bash
# Check database integrity
sqlite3 data/premiumgiftbox.db "PRAGMA integrity_check;"

# Restore from backup if needed
cp backups/latest_backup.db data/premiumgiftbox.db
pm2 restart premium-gift-box
```

### High Memory Usage
```bash
# Monitor memory
pm2 monit

# Increase max memory in ecosystem.config.js
max_memory_restart: '1G'

# Restart application
pm2 restart premium-gift-box
```

## Rollback Procedure

1. Stop application
```bash
pm2 stop premium-gift-box
```

2. Restore database from backup
```bash
cp backups/premiumgiftbox_backup_YYYY-MM-DD.db data/premiumgiftbox.db
```

3. Revert code changes
```bash
git checkout <previous-commit>
npm install
```

4. Start application
```bash
pm2 start premium-gift-box
```

## Security Best Practices

1. ✅ Change default admin password
2. ✅ Use strong JWT secret (32+ characters)
3. ✅ Enable HTTPS with valid SSL certificate
4. ✅ Configure firewall (UFW)
5. ✅ Regular security updates: `npm audit fix`
6. ✅ Limit file upload sizes
7. ✅ Enable rate limiting
8. ✅ Regular backup verification
9. ✅ Monitor audit logs
10. ✅ Use environment variables for secrets

## Support & Updates

For technical support:
- Check logs: `pm2 logs`
- Review API documentation
- Contact development team

---

Last Updated: 2024
