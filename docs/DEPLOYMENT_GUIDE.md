# Nexus AI Studio — Production Deployment Guide

## Overview

This guide covers deploying Nexus AI Studio to a fresh Ubuntu 26.04 server. The deployment is **fully automated** via the enhanced deployment script, which handles all setup in a single command.

**Stack:**
- **Web Framework:** Next.js 14 (App Router)
- **Authentication:** NextAuth (credentials-based)
- **Database:** PostgreSQL + Prisma ORM
- **Application Server:** Node.js 20 + PM2
- **GPU Compute:** Modal (deployed separately)
- **Reverse Proxy:** Cloudflare Tunnel (or your own)
- **Billing:** Stripe (sandbox/test mode until verified)

**What is NOT used:**
- ❌ Docker
- ❌ Supabase
- ❌ MUAPI (muapi.ai)

---

## Pre-Deployment Checklist

Before running the deployment script, ensure you have:

- [ ] Fresh Ubuntu 26.04 server with root/sudo access
- [ ] Server can reach the internet (curl, git, apt-get)
- [ ] You have a Cloudflare Tunnel domain (or reverse proxy set up)
- [ ] Strong passwords ready:
  - `ADMIN_PASSWORD` (for admin user login)
  - `TEST_PASSWORD` (for test user login)
- [ ] Optional: Stripe sandbox test keys (can be added later)
- [ ] Optional: Modal account for GPU backend (can be added later)
- [ ] GitHub repo cloned to the server (or will be cloned during deploy)
- [ ] At least 2GB RAM, 20GB disk (3GB+ RAM recommended)

---

## Quick Start (5 minutes)

### 1. Clone the Repository

```bash
cd /opt  # or your preferred location
git clone https://github.com/nexusaicorporate/nexus-studio.git
cd nexus-studio
```

### 2. Run the Deployment Script

```bash
sudo PUBLIC_URL=https://your-tunnel-domain.example.com \
     ADMIN_PASSWORD='YourSecureAdminPassword123!' \
     TEST_PASSWORD='YourSecureTestPassword456!' \
     bash scripts/deploy_ubuntu_26.04_enhanced.sh
```

**Required environment variables:**
- `PUBLIC_URL` — the domain users will access (for NextAuth callbacks)
- `ADMIN_PASSWORD` — password for the admin user
- `TEST_PASSWORD` — password for the test user

**Optional environment variables:**
- `DB_NAME` — PostgreSQL database name (default: `nexus_studio`)
- `DB_USER` — PostgreSQL username (default: `nexus_app`)
- `DB_PASS` — PostgreSQL password (auto-generated if not provided)
- `ADMIN_EMAIL` — admin email (default: `cscannell@nexusaigear.com`)
- `TEST_EMAIL` — test email (default: `test-studio@nexusaigear.com`)
- `DATABASE_URL` — external database URL (if using managed Postgres like RDS)

### 3. Verify Deployment

The script will output a deployment summary. Check that:
- ✓ Node.js and npm installed
- ✓ PostgreSQL created and running
- ✓ .env.local generated with secrets
- ✓ Prisma migrations applied
- ✓ Users provisioned
- ✓ Application started via PM2

You should see:
```
✓ Application started via PM2
✓ Application is responding on port 3000
```

### 4. Configure Reverse Proxy

Point your Cloudflare Tunnel (or reverse proxy) to `http://localhost:3000`:

**Cloudflare Tunnel:**
```bash
# From cloudflare.com/warp > Tunnels
# Create tunnel → Route public hostname to http://localhost:3000
```

**Nginx example:**
```nginx
server {
    listen 80;
    server_name your-domain.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Post-Deployment Configuration

### 1. Set Up Cloudflare Tunnel (if not already done)

```bash
# Install Cloudflare Warp for Linux
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create nexus-studio

# Route your domain
cloudflared tunnel route dns nexus-studio your-domain.example.com

# Start tunnel
cloudflared tunnel run nexus-studio
```

### 2. Set Up Modal GPU Backend

```bash
# Install Modal
pipx install modal

# Authenticate
modal token new

# Deploy the video generation worker
modal deploy modal/video_ltx.py
```

After deployment, copy the output URL and add to Settings in the app:
- Settings → Modal backend → paste URL

Then update `.env.local`:
```bash
sudo nano /opt/nexus-studio/.env.local
# Add:
# MODAL_TOKEN_ID=...
# MODAL_TOKEN_SECRET=...

# Restart the app
pm2 restart nexus-web
```

### 3. Configure Stripe Billing (Optional, Test Mode)

Get sandbox keys from [Stripe Dashboard (Test Mode)](https://dashboard.stripe.com/test/apikeys):

```bash
sudo nano /opt/nexus-studio/.env.local
```

Add:
```bash
STRIPE_SECRET_KEY=sk_test_xxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx...
```

Set up the webhook endpoint:
1. Go to Webhooks in Stripe Dashboard
2. Create endpoint pointing to: `https://your-domain.example.com/api/stripe/webhook`
3. Listen for: `payment_intent.succeeded`, `customer.subscription.updated`, etc.
4. Copy the secret to `STRIPE_WEBHOOK_SECRET`

Restart:
```bash
pm2 restart nexus-web
```

### 4. Add API Keys (Optional)

For vision model features (analyze images/videos):

**Gemini:**
```bash
sudo nano /opt/nexus-studio/.env.local
# Add:
# GEMINI_API_KEY=...

pm2 restart nexus-web
```

**OpenAI:**
```bash
# Add to .env.local:
# OPENAI_API_KEY=...

pm2 restart nexus-web
```

---

## Application Management

### Check Status

```bash
pm2 status
pm2 list
```

### View Logs

```bash
# Real-time logs
pm2 logs nexus-web

# Last 100 lines
pm2 logs nexus-web --lines 100

# Specific app logs
pm2 logs nexus-web --err  # errors only
```

### Restart Application

```bash
pm2 restart nexus-web
```

### Stop Application

```bash
pm2 stop nexus-web
```

### Start Application

```bash
pm2 start nexus-web
```

---

## Database Management

### Backup

```bash
# Single backup
pg_dump -U nexus_app nexus_studio > backup-$(date +%s).sql

# Automated daily backup (add to crontab)
sudo crontab -e
# Add: 0 2 * * * pg_dump -U nexus_app nexus_studio > /backups/db-$(date +\%Y-\%m-\%d).sql
```

### Restore

```bash
psql -U nexus_app nexus_studio < backup-12345.sql
```

### Direct Database Access

```bash
psql -U nexus_app -d nexus_studio -h localhost
```

### Run Migrations

```bash
cd /opt/nexus-studio
npx prisma migrate deploy
```

### View Database Schema

```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs nexus-web --err

# Check port is available
netstat -tlnp | grep 3000

# Check Node process
ps aux | grep node
```

### Database connection error

```bash
# Test PostgreSQL
psql -U nexus_app -d nexus_studio -h localhost

# Check .env.local DATABASE_URL
cat .env.local | grep DATABASE_URL

# Verify Postgres is running
systemctl status postgresql
```

### Auth not working

Ensure `NEXTAUTH_URL` in `.env.local` matches the public domain:

```bash
cat .env.local | grep NEXTAUTH_URL
# Should be: https://your-domain.example.com
# NOT: http://localhost:3000
```

### High memory usage

Increase Node heap size in PM2:

```bash
pm2 stop nexus-web
pm2 start "npm run start" \
  --name nexus-web \
  --node-args="--max-old-space-size=2048"
pm2 save
```

### Slow build time

Pre-build locally, then deploy:

```bash
npm run build  # locally
git commit -m "build: pre-built .next"
```

---

## Security Hardening

### Enable UFW Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Create Non-Root App User

```bash
sudo useradd -m -s /bin/bash nexus
sudo chown -R nexus:nexus /opt/nexus-studio
# Run PM2 as nexus user
sudo su - nexus
pm2 start npm --name nexus-web -- run start
```

### Enable SSL with Certbot (if not using Cloudflare Tunnel)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.example.com
```

### Set Swap (if <2GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Monitoring

### PM2+ Monitoring (Paid)

```bash
pm2 link  # Connect to PM2+ (https://pm2.io)
```

### Manual Monitoring

```bash
# CPU/Memory
watch -n 5 'ps aux | grep node'

# Disk space
df -h

# Memory usage
free -h

# Database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('nexus_studio'));"
```

---

## Deployment Logs

The deployment script saves a detailed log to:
```
/opt/nexus-studio/deployment-<timestamp>.log
```

Check it for any warnings or errors:
```bash
tail -n 50 deployment-*.log
```

---

## Going Live

### Before Production:

1. ✓ Run deployment script on fresh server
2. ✓ Configure Cloudflare Tunnel or reverse proxy
3. ✓ Test user login with admin/test accounts
4. ✓ Configure Modal backend for video generation
5. ✓ Set up Stripe in test mode and verify payments
6. ✓ Test with real traffic (load test)
7. ✓ Set up database backups
8. ✓ Enable firewall & security hardening

### Switching to Live (Stripe):

**Only after full system verification:**

1. Go to Stripe Dashboard (switch to Live mode)
2. Get live keys (sk_live_...)
3. Update `.env.local` with LIVE keys
4. Restart: `pm2 restart nexus-web`
5. Never commit live keys to git

---

## Support & Further Help

- **Deployment issues?** Check the deployment log: `cat deployment-*.log`
- **Application errors?** Check PM2 logs: `pm2 logs nexus-web`
- **Database issues?** Verify Postgres: `systemctl status postgresql`
- **Auth problems?** Check NEXTAUTH_URL matches your domain

---

Last updated: 2026-07-02
Stack: Next.js 14 + NextAuth + Prisma + PostgreSQL + PM2

