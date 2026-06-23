#!/bin/bash
set -e

# Nexus AI Studio - Ubuntu 26.04 Deployment Script
# This script installs all necessary dependencies and sets up the server.

echo "============================================================"
echo "    Nexus AI Studio - Ubuntu 26.04 Server Setup Script      "
echo "============================================================"

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or using sudo."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating System Packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl git wget build-essential openssl jq

echo "==> Installing Python3 and Pipx..."
apt-get install -y python3 python3-pip pipx python3-venv
# Ensure pipx is in PATH for all users
pipx ensurepath

echo "==> Installing Modal CLI via pipx..."
sudo -u $SUDO_USER pipx install modal || pipx install modal

echo "==> Installing Node.js (v20)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2 npm@latest

echo "==> Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key:
    apt-get update
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add the repository to Apt sources:
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker already installed, skipping..."
fi

# Ensure user is in docker group
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
fi

echo "==> Setting up Self-Hosted Supabase..."
SUPABASE_DIR="/opt/supabase"
if [ ! -d "$SUPABASE_DIR" ]; then
    git clone --depth 1 https://github.com/supabase/supabase "$SUPABASE_DIR"
fi

cd "$SUPABASE_DIR/docker"
cp .env.example .env

# Generate secure passwords for Supabase
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9')
JWT_SECRET=$(openssl rand -hex 32)
ANON_KEY=$(openssl rand -hex 32) # In a real scenario, JWT dictates the anon key, but we'll use Supabase's defaults or prompt user
SERVICE_ROLE_KEY=$(openssl rand -hex 32)

# Update Supabase .env with secure passwords
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/g" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/g" .env
sed -i "s/ANON_KEY=.*/ANON_KEY=$ANON_KEY/g" .env
sed -i "s/SERVICE_ROLE_KEY=.*/SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY/g" .env
sed -i "s/STUDIO_DEFAULT_ORGANIZATION=.*/STUDIO_DEFAULT_ORGANIZATION=Nexus Studio/g" .env

# Start Supabase
echo "==> Starting Supabase Docker Containers..."
docker compose pull
docker compose up -d

echo "==> Supabase is starting on http://localhost:8000"

# Assuming Nexus Studio codebase is cloned to /opt/nexus-studio or current directory
PROJECT_DIR=$(pwd)
if [[ "$PROJECT_DIR" == *"/supabase/docker" ]]; then
    # if we are in /opt/supabase/docker, go back to where script was called from
    cd - > /dev/null
fi
# We assume the script is executed from the project root.
echo "==> Setting up Nexus AI Studio Web App..."

# Install dependencies
npm install

# Setup environment variables for Next.js
echo "==> Generating .env.local..."
cat <<EOF > .env.local
NEXT_PUBLIC_WEB_MODE=1
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY

# Server-only secrets
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EOF

echo "==> Building Next.js App..."
npm run build

echo "==> Starting Nexus Web App via PM2..."
pm2 start npm --name "nexus-web" -- run start
pm2 save
pm2 startup | tail -n 1 | bash -

echo "============================================================"
echo "                   DEPLOYMENT COMPLETE                      "
echo "============================================================"
echo ""
echo "Nexus AI Studio is running via PM2 on port 3000."
echo "Supabase Local Instance is running via Docker on port 8000."
echo ""
echo "==> SUPABASE CREDENTIALS (SAVE THESE!):"
echo "URL:                 http://localhost:8000"
echo "Studio Dashboard:    http://localhost:8000"
echo "Postgres Password:   $POSTGRES_PASSWORD"
echo "JWT Secret:          $JWT_SECRET"
echo "Anon Key:            $ANON_KEY"
echo "Service Role Key:    $SERVICE_ROLE_KEY"
echo ""
echo "==> NEXT STEPS:"
echo "1. Modal CLI: Run 'modal setup' (as your normal user) to link your Modal account."
echo "2. Reverse Proxy: You must configure a reverse proxy (like Nginx, Caddy, or a Cloudflare Tunnel) to expose port 3000 (web) and 8000 (Supabase API) securely via HTTPS."
echo "3. Stripe: If using Stripe, update your .env.local with Stripe keys and restart pm2: 'pm2 restart nexus-web'."
echo "============================================================"
