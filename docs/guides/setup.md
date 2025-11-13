# Premium Gift Box Business App - Setup Guide

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ (Download from [nodejs.org](https://nodejs.org))
- **Git** (for version control)
- **Android Studio** (for mobile app testing) OR **Expo Go** app on your phone

### 📁 Project Structure
```
premium-gift-box-app/
├── 📱 mobile-app/          # React Native + Expo mobile app
├── 🖥️ backend-server/      # Self-hosted SQLite backend
├── 🔄 sync-system/         # Data synchronization
├── 🛠️ development-tools/   # Database viewer, deployment tools
└── 📚 documentation/       # Setup and maintenance guides
```

---

## 📱 Mobile App Setup

### 1. Install Dependencies
```bash
cd mobile-app
npm install
```

### 2. Install Expo CLI
```bash
npm install -g @expo/cli
```

### 3. Start Development Server
```bash
npm start
```

### 4. Test on Device
- **Option A**: Install "Expo Go" app on your phone and scan QR code
- **Option B**: Use Android/iOS simulator

### 5. Build APK (for distribution)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Build Android APK
npm run build:android
```

---

## 🖥️ Backend Server Setup

### 1. Install Dependencies
```bash
cd backend-server
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

### 3. Start Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

### 4. Verify Server is Running
- Open browser to: http://localhost:3000/api/health
- Should show: `{"status":"ok","timestamp":"..."}`

---

## 🔄 Data Synchronization Setup

### 1. Configure Backup Computer (Optional)
If you want to sync data to your father's computer:

1. Install Node.js on the backup computer
2. Copy the `backend-server` folder to the backup computer
3. Set environment variables:

```bash
# On your main computer (.env file)
BACKUP_HOSTS=192.168.1.100  # IP address of father's computer

# On backup computer (.env file)
SERVER_MODE=backup
MAIN_SERVER=192.168.1.50    # IP address of your computer
```

### 2. Start Sync System
```bash
cd sync-system
node sync-to-backup.js
```

### 3. Manual Backup
```bash
cd backend-server
npm run backup
```

---

## 🛠️ Development Tools

### Database Viewer
- Open `development-tools/database-viewer.html` in your browser
- View and manage your business data visually
- No installation required - just open the HTML file

### Backup Manager
```bash
cd development-tools
node backup-manager.js
```

---

## 📊 Connecting Mobile App to Server

### 1. Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (usually 192.168.1.xxx)

**Mac/Linux:**
```bash
ifconfig
```

### 2. Update Mobile App Configuration
Edit `mobile-app/src/config/api.js`:
```javascript
export const API_BASE_URL = 'http://192.168.1.50:3000'; // Your computer's IP
```

### 3. Test Connection
- Start backend server
- Start mobile app
- Check if dashboard loads data

---

## 🔧 Configuration

### Backend Server Configuration
Create `backend-server/.env` file:
```bash
PORT=3000
HOST=0.0.0.0
JWT_SECRET=your-secret-key-change-this
DATABASE_PATH=./premium_gift_box.db
BACKUP_ENABLED=true
BACKUP_INTERVAL=4  # hours
AUTO_SYNC_ENABLED=true
```

### Mobile App Configuration
Create `mobile-app/.env` file:
```bash
API_BASE_URL=http://192.168.1.50:3000
OFFLINE_MODE=true
AUTO_SYNC=true
```

---

## 🔐 Security Setup

### 1. Change Default Admin Password
- Login to database viewer: http://localhost:3000
- Default credentials: admin / admin123
- **IMMEDIATELY** change the password!

### 2. Setup User Accounts
```sql
-- Add business users
INSERT INTO users (id, username, email, password_hash, role, full_name)
VALUES 
  ('user-001', 'manager', 'manager@premiumgiftbox.com', '$2a$10$...', 'manager', 'Business Manager'),
  ('user-002', 'employee', 'employee@premiumgiftbox.com', '$2a$10$...', 'employee', 'Production Staff');
```

### 3. Enable HTTPS (Production)
For production use, configure SSL certificates:
```bash
# Install certificates
mkdir ssl
# Copy your SSL certificates to ssl/ folder
```

---

## 📱 Mobile App Installation

### For Personal Use (APK)
1. Build APK: `npm run build:android`
2. Download APK to your phone
3. Enable "Install from Unknown Sources"
4. Install the APK

### For Google Play Store (Future)
1. Create Google Play Developer account
2. Configure app signing
3. Upload AAB bundle

---

## 🚨 Troubleshooting

### Common Issues

**1. Mobile app can't connect to server**
- Check if backend server is running: http://localhost:3000/api/health
- Verify IP address in mobile app config
- Check firewall settings (allow port 3000)

**2. Database connection errors**
- Check if SQLite database file exists
- Run: `npm run init-db` to recreate database
- Check file permissions

**3. Expo build errors**
- Clear cache: `expo r -c`
- Delete node_modules and reinstall
- Check Expo CLI version: `expo --version`

**4. Sync system not working**
- Check network connectivity between computers
- Verify IP addresses in configuration
- Check backup directory permissions

### Log Files
- Backend logs: `backend-server/logs/`
- Sync logs: `sync-system/backups/sync_log.json`
- Mobile app logs: Use Expo Developer Tools

---

## 📞 Getting Help

### Documentation
- [MAINTENANCE.md](./MAINTENANCE.md) - Long-term maintenance
- [BACKUP.md](./BACKUP.md) - Backup strategies
- [FEATURES.md](./FEATURES.md) - Feature documentation

### Support
- Check logs for error messages
- Verify all prerequisites are installed
- Test with minimal configuration first

---

## 🎯 Next Steps

After successful setup:

1. **Add Your Business Data**
   - Create customer profiles
   - Add inventory items
   - Set up pricing rules

2. **Configure Workflows**
   - Customize order statuses
   - Set up notification templates
   - Configure backup schedules

3. **Train Your Team**
   - Create user accounts
   - Document business processes
   - Set up access controls

4. **Optimize Performance**
   - Monitor database size
   - Set up automated backups
   - Plan for business growth

---

## ✅ Setup Checklist

- [ ] Node.js installed
- [ ] Mobile app dependencies installed
- [ ] Backend server running
- [ ] Database initialized
- [ ] Mobile app connects to server
- [ ] Admin password changed
- [ ] Backup system configured
- [ ] Development tools accessible
- [ ] First order/customer created
- [ ] Team members trained

**🎉 Congratulations! Your Premium Gift Box business management system is ready!**