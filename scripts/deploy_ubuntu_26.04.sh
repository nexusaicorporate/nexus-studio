#!/bin/bash
set -e

# Nexus AI Studio — Ubuntu 26.04 Deployment Script
# Stack: Next.js (web) + NextAuth + Prisma + PostgreSQL + PM2, with the GPU
# backend on Modal. NO Docker, NO Supabase.
#
# Run as root/sudo from the project root. If you already have a managed Postgres
# (RDS, Neon, etc.), export DATABASE_URL before running and local Postgres install
# is skipped.

echo "============================================================"
echo "    Nexus AI Studio — Ubuntu 26.04 Server Setup (Postgres)  "
echo "============================================================"

if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or using sudo."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
PROJECT_DIR="$(pwd)"

echo "==> Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl git wget build-essential openssl jq

echo "==> Installing Python3 + pipx + Modal CLI (for the GPU backend)..."
apt-get install -y python3 python3-pip pipx python3-venv
pipx ensurepath
sudo -u "${SUDO_USER:-root}" pipx install modal || pipx install modal

echo "==> Installing Node.js v20 + PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2 npm@latest

# ---- PostgreSQL -----------------------------------------------------------
if [ -n "$DATABASE_URL" ]; then
  echo "==> DATABASE_URL is set — using your external Postgres, skipping local install."
else
  echo "==> Installing local PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql

  DB_NAME="${DB_NAME:-nexus_studio}"
  DB_USER="${DB_USER:-nexus}"
  DB_PASS="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9')"

  echo "==> Creating database role + database..."
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

  DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
  echo "    Local Postgres ready. DB password: $DB_PASS  (save this)"
fi

# ---- Next.js app env ------------------------------------------------------
echo "==> Setting up the Nexus AI Studio web app..."
cd "$PROJECT_DIR"
npm install

NEXTAUTH_SECRET="$(openssl rand -base64 32)"
# Public URL the app is reached at. Behind Cloudflare Tunnel / a proxy, export
# PUBLIC_URL=https://your-domain before running so NextAuth cookies/callbacks work.
PUBLIC_URL="${PUBLIC_URL:-http://localhost:3000}"

echo "==> Generating .env.local (NEXTAUTH_URL=$PUBLIC_URL)..."
cat <<EOF > .env.local
# Web SaaS mode
NEXT_PUBLIC_WEB_MODE=1

# Postgres (Prisma)
DATABASE_URL="$DATABASE_URL"

# NextAuth
NEXTAUTH_URL=$PUBLIC_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Stripe — DEV/TEST MODE until the system is verified complete.
# Paste Stripe *test* keys (sk_test_/whsec_/pk_test_) or leave blank; billing stays
# inert until set. Switch to LIVE keys only after full verification.
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}
EOF

# ---- Prisma: schema + seed ------------------------------------------------
echo "==> Applying Prisma schema to Postgres..."
npx prisma generate
npx prisma migrate deploy
echo "==> Seeding default data (prompts/recipes)..."
npx prisma db seed || echo "    (no seed configured or seed skipped)"

echo "==> Provisioning admin/test users (set ADMIN_PASSWORD/TEST_PASSWORD to enable)..."
if [ -n "$ADMIN_PASSWORD" ] && [ -n "$TEST_PASSWORD" ]; then
  node scripts/provision_users.mjs || echo "    (user provisioning skipped/failed)"
else
  echo "    Skipped — export ADMIN_PASSWORD and TEST_PASSWORD then run: node scripts/provision_users.mjs"
fi

# ---- Build + run ----------------------------------------------------------
echo "==> Building Next.js app..."
npm run build

echo "==> Starting via PM2..."
pm2 start npm --name "nexus-web" -- run start
pm2 save
pm2 startup | tail -n 1 | bash - || true

echo "============================================================"
echo "                   DEPLOYMENT COMPLETE                      "
echo "============================================================"
echo ""
echo "Nexus AI Studio (web) is running via PM2 on port 3000 — Postgres + Prisma, no Docker/Supabase."
echo ""
echo "==> NEXT STEPS:"
echo "1. Cloudflare Tunnel: point your tunnel at http://localhost:3000. For auth to work, the"
echo "   public URL must be in .env.local as NEXTAUTH_URL — re-run with PUBLIC_URL exported, or"
echo "   edit .env.local (NEXTAUTH_URL=https://your-domain) and 'pm2 restart nexus-web'."
echo "2. Modal (GPU backend): run 'modal setup', then 'modal deploy modal/video_ltx.py' and"
echo "   paste the URL into Settings → Modal backend."
echo "3. Stripe: SANDBOX/TEST mode. Add test keys to .env.local + 'pm2 restart nexus-web' to"
echo "   exercise billing. Switch to LIVE keys only after the system is verified complete."
echo "============================================================"
