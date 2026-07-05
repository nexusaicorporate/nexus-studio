# Landing Page Deployment Guide

## Setup on Ubuntu Server

### 1. Copy landing page to server
```bash
scp -r landing-page root@47.236.51.230:/srv/nexus-landing
```

### 2. SSH into server and install dependencies
```bash
ssh root@47.236.51.230
cd /srv/nexus-landing
npm install
```

### 3. Start with PM2
```bash
pm2 start server.js --name "landing-page"
pm2 save
```

### 4. Configure Cloudflare Tunnel / Nginx Routing

**Option A: Using Cloudflare Tunnel (Recommended)**
- Point `www.nexusaigear.com` to `http://localhost:3001`
- Keep `studio.nexusaigear.com` pointing to `http://localhost:3000`

**Option B: Using Nginx (if not using Cloudflare Tunnel)**
```nginx
server {
    listen 80;
    server_name www.nexusaigear.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name studio.nexusaigear.com;

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

### 5. Verify
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs landing-page

# Test locally
curl http://localhost:3001
```

## DNS Setup (Already Done)
- `www.nexusaigear.com` A record points to your server IP (47.236.51.230)
- `studio.nexusaigear.com` A record points to your server IP (47.236.51.230)

## Ports
- Landing page: `localhost:3001`
- App: `localhost:3000`

## Troubleshooting
- Check firewall: `ufw status`
- Restart server: `pm2 restart landing-page`
- View real-time logs: `pm2 logs landing-page --lines 100 --follow`
