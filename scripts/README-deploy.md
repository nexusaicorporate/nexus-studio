# Ubuntu 26.04 Server Deployment

This guide explains how to use the automated deployment script (`deploy_ubuntu_26.04.sh`) to spin up the Nexus AI Studio web application and a self-hosted Supabase instance on a fresh Ubuntu 26.04 server.

## Prerequisites
- A fresh Ubuntu 26.04 VPS/Server with root access.
- At least 2 CPU cores and 4GB RAM (Docker, Next.js, and Supabase require some overhead).
- The Nexus AI Studio repository cloned to the server.

## Running the Deployment Script

1. SSH into your Ubuntu server.
2. Clone your repository (if not done already):
   ```bash
   git clone <your-repo-url> /opt/nexus-studio
   cd /opt/nexus-studio
   ```
3. Make the script executable:
   ```bash
   chmod +x scripts/deploy_ubuntu_26.04.sh
   ```
4. Run the script as `root` (or with `sudo`):
   ```bash
   sudo ./scripts/deploy_ubuntu_26.04.sh
   ```

## What the Script Does

The script automates the tedious setup process, completely avoiding manual errors:
1. **Installs Requirements**: Installs Node.js v20, PM2, Docker, Docker Compose, Python3, and Pipx.
2. **Installs Modal CLI**: Installs `modal` globally via `pipx` (to bypass Python 3.12+ PEP668 environment restrictions safely).
3. **Spins up Supabase**: Clones the official Supabase docker repo, securely generates cryptographically strong passwords and JWT secrets, applies them to the Supabase `.env` file, and starts the database engine.
4. **Builds the Web App**: Runs `npm install`, generates a secure `.env.local` binding your web app to the local Supabase container, and runs `npm run build`.
5. **Starts the App**: Uses PM2 to start the `next start` server in the background and saves the PM2 process list so it survives server reboots.

## ⚠️ Important Post-Installation Steps

Once the script finishes, it will print out your generated Supabase passwords and keys. **Save these securely.**

### 1. Authenticate Modal
To enable the web app's "One-Click Modal Deploy", you must authenticate the Modal CLI on the server:
```bash
# Run this as your normal user (NOT root/sudo)
modal setup
```
Follow the URL provided to log in.

### 2. Configure a Domain and Reverse Proxy (Nginx/Cloudflare)
The script leaves the applications running on `localhost`:
- Web App: `http://localhost:3000`
- Supabase: `http://localhost:8000`

To access them over the public internet with HTTPS, you must configure a reverse proxy or tunnel.

**Option A: Cloudflare Tunnels (Easiest & Most Secure)**
1. Install `cloudflared` on the server.
2. Create a tunnel in the Cloudflare Dashboard.
3. Route `your-domain.com` to `http://localhost:3000` and `api.your-domain.com` to `http://localhost:8000`.

**Option B: Nginx + Certbot**
```bash
sudo apt install nginx python3-certbot-nginx
```
Create a site configuration (`/etc/nginx/sites-available/nexus`):
```nginx
server {
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Enable the site and run Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Stripe (Optional)
If you enable Stripe billing, edit `/opt/nexus-studio/.env.local` and add your `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. 
Apply the changes by restarting the app:
```bash
pm2 restart nexus-web
```
