# Cardose Premium Gift Box - Deployment Guide

This guide covers three deployment scenarios. Pick the one that fits your situation.

| Scenario | Best For | Cost | Internet Required | HTTPS |
|----------|----------|------|-------------------|-------|
| **1. Local PC** | Development, testing, solo use | Free | No | No |
| **2. LAN Server** | Office team on same WiFi | Free (use existing PC) | No | No |
| **3. Cloud VPS** | Access from anywhere, always online | $4-12/month | Yes | Yes (automatic) |

---

## Prerequisites (All Scenarios)

- [Node.js 20+](https://nodejs.org/) installed
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed (for Scenarios 2 & 3)
- Git (to clone the project)

---

## Scenario 1: Local PC (Development)

**What this gives you:** Everything runs on your computer. You open the web dashboard in your browser at `http://localhost`. The mobile app connects via Expo Go on the same machine or your phone on the same WiFi.

### Step 1: Set up the backend

```bash
cd backend

# Copy environment file
cp ../.env.example .env

# Edit .env and set a JWT secret (any random string)
# On Linux/Mac: sed -i 's/CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING/my_secret_key_change_this/' .env
# On Windows: open .env in a text editor and change JWT_SECRET

# Install dependencies
npm install

# Start the backend (keeps running in terminal)
npm run dev
```

The backend is now running at `http://localhost:3001`.

Test it:
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 2: Set up the web dashboard

Open a **new terminal**:

```bash
cd web-dashboard

# Install dependencies
npm install

# Start the development server
npm start
```

The web dashboard opens at `http://localhost:3000`.

### Step 3: Set up the mobile app

Open a **new terminal**:

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npm start
```

Scan the QR code with Expo Go on your phone. The app will connect to `http://localhost:3001` by default.

**If your phone can't reach localhost** (different device than your PC):
1. Find your PC's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. On the mobile app login screen, tap **"Server Settings"**
3. Enter `http://YOUR_PC_IP:3001` (e.g., `http://192.168.1.100:3001`)
4. Tap **"Test Connection"** to verify

### Step 4: Create the first user

The first time, you need to create an admin user. On the mobile app login screen, tap "Don't have an account? Register" and fill in the form.

Or use the API directly:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","email":"admin@example.com","full_name":"Admin","role":"owner"}'
```

### Summary (Scenario 1)

| Component | URL | Command |
|-----------|-----|---------|
| Backend | http://localhost:3001 | `cd backend && npm run dev` |
| Web Dashboard | http://localhost:3000 | `cd web-dashboard && npm start` |
| Mobile App | Expo Go | `cd mobile && npm start` |

You need **3 terminal windows** running simultaneously.

---

## Scenario 2: LAN Server (Office Network)

**What this gives you:** A dedicated PC in your office runs the system 24/7. Everyone on the same WiFi can access it from their phones and browsers. When the PC is off, phones still work offline and sync when it comes back.

### Step 1: Find the server PC's IP address

On the PC that will be the server:

```bash
# Windows
ipconfig
# Look for "IPv4 Address" under your WiFi/Ethernet adapter
# Example: 192.168.1.100

# Mac/Linux
ifconfig
# or: hostname -I
```

Write down this IP address. You'll use it everywhere below.

> **Tip:** Set a static IP on this PC so it doesn't change. Go to your router's settings and assign a fixed IP to this PC's MAC address.

### Step 2: Configure the environment

```bash
cd MobileApp

# Copy the example config
cp .env.example .env
```

Edit `.env` with these values (replace `192.168.1.100` with your actual IP):

```env
JWT_SECRET=generate_a_random_string_here_at_least_32_characters_long
SERVER_URL=http://192.168.1.100
API_PORT=3001
WEB_PORT=80
CORS_ORIGIN=http://192.168.1.100,http://192.168.1.100:80,http://localhost,http://localhost:80
```

To generate a random JWT secret:
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# Or just type a long random string manually
```

### Step 3: Start with Docker Compose

```bash
docker-compose up -d
```

This builds and starts both the backend and web dashboard. First run takes 2-5 minutes to build.

Check everything is running:
```bash
docker-compose ps

# Should show:
# cardose-backend   running (healthy)
# cardose-web       running (healthy)
```

Check the backend health:
```bash
curl http://192.168.1.100:3001/api/health
```

### Step 4: Access from other devices

**Web Dashboard (any computer on the network):**
Open a browser and go to `http://192.168.1.100`

**Mobile App (phones on the network):**
1. Install the app (via Expo Go for testing, or build an APK for production)
2. On the login screen, tap **"Server Settings"**
3. Enter: `http://192.168.1.100:3001`
4. Tap **"Test Connection"** — should show green "Connected to server"
5. Log in normally

### Step 5: Create the first user

Open `http://192.168.1.100` in your browser. The login page will show.

Create the admin user via API:
```bash
curl -X POST http://192.168.1.100:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_secure_password","email":"admin@company.com","full_name":"Admin","role":"owner"}'
```

Then log in via the web dashboard or mobile app.

### Managing the server

```bash
# View logs
docker-compose logs -f

# View only backend logs
docker-compose logs -f backend

# Restart everything
docker-compose restart

# Stop everything
docker-compose down

# Start again
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build
```

### Summary (Scenario 2)

| Who | What | URL |
|-----|------|-----|
| Manager | Web Dashboard (browser) | http://192.168.1.100 |
| Employees | Mobile App (phone) | Server: http://192.168.1.100:3001 |
| Server PC | Docker Compose | `docker-compose up -d` |

---

## Scenario 3: Cloud VPS (Production)

**What this gives you:** The system runs 24/7 on a cloud server. Accessible from anywhere in the world via HTTPS. Automatic SSL certificates. Most reliable option.

### Step 1: Get a VPS

Sign up for any VPS provider:

| Provider | Cheapest Plan | RAM | Link |
|----------|--------------|-----|------|
| DigitalOcean | $6/month | 1GB | droplets |
| Hetzner | $4/month | 2GB | cloud servers |
| Vultr | $6/month | 1GB | cloud compute |

**Requirements:** Ubuntu 22.04+ or Debian 12+, at least 1GB RAM, 25GB SSD.

### Step 2: Set up the server

SSH into your VPS:
```bash
ssh root@YOUR_SERVER_IP
```

Install Docker:
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 3: Get a domain name

You need a domain name for HTTPS to work. Options:
- Buy a domain (~$10/year) from Namecheap, Cloudflare, etc.
- Use a free subdomain service

**Point your domain to the VPS:**
In your domain registrar's DNS settings, add an **A record**:
```
Type: A
Name: cardose (or @ for root domain)
Value: YOUR_SERVER_IP
TTL: 3600
```

Wait 5-10 minutes for DNS to propagate. Verify:
```bash
ping cardose.yourdomain.com
# Should resolve to your VPS IP
```

### Step 4: Clone and configure

On the VPS:
```bash
# Clone the project
git clone YOUR_REPO_URL /opt/cardose
cd /opt/cardose/MobileApp

# Create the .env file
cp .env.example .env
```

Edit `.env`:
```env
# REQUIRED
JWT_SECRET=paste_a_64_character_random_string_here

# Your domain
SERVER_URL=https://cardose.yourdomain.com
DOMAIN=cardose.yourdomain.com
LETSENCRYPT_EMAIL=your@email.com

# CORS - must match your domain
CORS_ORIGIN=https://cardose.yourdomain.com

# Ports (internal, Caddy handles external 80/443)
API_PORT=3001
WEB_PORT=8080

# Optional but recommended
AUTO_BACKUP=true
BACKUP_FREQUENCY=4
```

Generate the JWT secret:
```bash
openssl rand -hex 32
```

### Step 5: Deploy with HTTPS

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

This starts three containers:
- **cardose-backend** — API server
- **cardose-web** — Web dashboard (Nginx)
- **cardose-caddy** — HTTPS reverse proxy (automatic Let's Encrypt)

Caddy automatically obtains and renews SSL certificates. No manual configuration needed.

Check everything is running:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# All three should show "running"
```

### Step 6: Verify it works

```bash
# Test HTTPS
curl https://cardose.yourdomain.com/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

Open `https://cardose.yourdomain.com` in your browser. You should see the login page with a valid SSL certificate (green padlock).

### Step 7: Create the first user

```bash
curl -X POST https://cardose.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_secure_password","email":"admin@company.com","full_name":"Admin","role":"owner"}'
```

### Step 8: Connect mobile apps

On each phone:
1. Open the Cardose app
2. On the login screen, tap **"Server Settings"**
3. Enter: `https://cardose.yourdomain.com`
4. Tap **"Test Connection"** — green dot should appear
5. Log in with admin credentials

The URL is saved permanently on the phone. Users only need to do this once.

### Managing the production server

```bash
# Go to project directory
cd /opt/cardose/MobileApp

# View all logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# View only backend logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend

# Restart all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart

# Stop everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Rebuild after pulling new code
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Summary (Scenario 3)

| Who | What | URL |
|-----|------|-----|
| Anyone | Web Dashboard | https://cardose.yourdomain.com |
| Phones | Mobile App | Server: https://cardose.yourdomain.com |
| Admin | SSH | `ssh root@YOUR_SERVER_IP` |

---

## Data & Backups

### Where is the data stored?

| What | Location (Docker) | Location (Local Dev) |
|------|-------------------|---------------------|
| Database | Docker volume `backend-data` | `backend/data/premiumgiftbox.db` |
| Uploaded files | Docker volume `backend-uploads` | `backend/uploads/` |
| Auto-backups | Docker volume `backend-backups` | `backend/backups/` |

### Manual backup

```bash
# Create a backup via API
curl -X POST http://localhost:3001/api/backup/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or copy the database file directly (Docker)
docker cp cardose-backend:/app/data/premiumgiftbox.db ./backup_$(date +%Y%m%d).db

# Local development
cp backend/data/premiumgiftbox.db ./backup_$(date +%Y%m%d).db
```

### Restore from backup

```bash
# Stop the backend first
docker-compose stop backend

# Copy backup into the container volume
docker cp ./backup_file.db cardose-backend:/app/data/premiumgiftbox.db

# Start again
docker-compose start backend
```

### Automatic backups

Enabled by default in `.env`:
```env
AUTO_BACKUP=true
BACKUP_FREQUENCY=4   # Every 4 hours
```

---

## Mobile App Distribution

### For testing (Expo Go)

Everyone installs **Expo Go** from the app store, then scans the QR code from `npm start` in the `mobile/` directory. Quick but requires the Expo development server running.

### For production (standalone APK/IPA)

Build a standalone app that doesn't need Expo Go:

```bash
cd mobile

# Build Android APK
eas build --platform android --profile preview

# Build iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

The built APK can be shared directly to phones via email, WhatsApp, or USB. No Play Store needed for internal use.

> **Note:** Before building, update `mobile/src/config.ts` to set your production server URL as the `DEFAULT_BASE_URL`, or instruct users to configure it via Server Settings on the login screen.

---

## Offline Mode (Mobile App)

The mobile app works offline automatically:

| Action | Offline | Online |
|--------|---------|--------|
| View orders, customers, inventory | From local cache | From server (fresh) |
| Create/edit orders | Saved locally, queued | Saved to server immediately |
| Take photos | Saved locally | Uploaded to server |
| Sync | Queued for later | Auto-syncs every 15 minutes |

When the server comes back online, the app automatically syncs all pending changes. You can also manually sync from the app.

---

## Troubleshooting

### Backend won't start

```
FATAL: JWT_SECRET environment variable is required
```
**Fix:** Set `JWT_SECRET` in your `.env` file. Any random string works.

---

### Mobile app says "Server unreachable"

1. Make sure the backend is running: `curl http://YOUR_SERVER:3001/api/health`
2. Check the URL in Server Settings — include the port (`:3001`)
3. Make sure your phone is on the same WiFi (Scenario 2)
4. Check firewall — port 3001 must be open
5. Try the full URL in your phone's browser first

---

### Web dashboard shows connection error

1. Check if the backend container is running: `docker-compose ps`
2. Check backend logs: `docker-compose logs backend`
3. The nginx proxy needs the backend to be healthy first

---

### HTTPS certificate not working (Scenario 3)

1. Make sure your domain DNS points to the VPS IP: `dig cardose.yourdomain.com`
2. Check Caddy logs: `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs caddy`
3. Ports 80 and 443 must be open on the VPS firewall
4. Let's Encrypt needs both ports to issue certificates

---

### Docker build fails with memory error

Your server might not have enough RAM. Minimum 1GB required.
```bash
# Check available memory
free -h

# Add swap space if needed (on VPS)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

### Database locked errors (multiple users)

SQLite handles concurrent reads well but serializes writes. With 3-5 users this rarely happens. If you see "database is locked" errors:
1. The backend already uses WAL mode (better concurrency)
2. Restart the backend: `docker-compose restart backend`
3. If persistent, consider migrating to PostgreSQL (future)

---

## Security Checklist

Before going live (Scenario 2 or 3):

- [ ] Change `JWT_SECRET` from the example value to a random 64-character string
- [ ] Set strong passwords for all user accounts
- [ ] Restrict `CORS_ORIGIN` to only your actual domain/IP
- [ ] Enable HTTPS for Scenario 3 (automatic with Caddy)
- [ ] Keep Docker images updated: `docker-compose pull && docker-compose up -d`
- [ ] Enable automatic backups: `AUTO_BACKUP=true`
- [ ] Do NOT expose port 3001 to the internet in Scenario 3 (Caddy handles routing)
