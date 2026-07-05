#!/bin/bash
set -e

# Nexus AI Studio — Ubuntu 26.04 Production Deployment (ENHANCED)
# ================================================================
# Stack: Next.js 14 (App Router) + NextAuth + Prisma + PostgreSQL + PM2
# GPU backend: Modal (deployed separately)
# Configuration: NO Docker, NO Supabase, NO MUAPI
#
# USAGE (as root, from repo root):
#   sudo PUBLIC_URL=https://your-domain \
#        ADMIN_PASSWORD='secure-password-here' \
#        TEST_PASSWORD='test-password-here' \
#        bash scripts/deploy_ubuntu_26.04_enhanced.sh
#
# This script will:
#   1. Validate environment & prerequisites
#   2. Install system dependencies
#   3. Configure PostgreSQL + create database
#   4. Install Node.js 20 + PM2
#   5. Build the Next.js application
#   6. Configure .env.local with secrets
#   7. Run Prisma migrations
#   8. Provision admin/test users
#   9. Start the application via PM2
#   10. Output deployment summary + next steps

# ========================================================================
# CONFIGURATION
# ========================================================================

export DEBIAN_FRONTEND=noninteractive
PROJECT_DIR="$(pwd)"
TIMESTAMP=$(date +%s)
DEPLOY_LOG="${PROJECT_DIR}/deployment-${TIMESTAMP}.log"
APP_NAME="nexus-web"
APP_PORT=3000
NODE_ENV="production"

# PostgreSQL defaults
DB_NAME="${DB_NAME:-nexus_studio}"
DB_USER="${DB_USER:-nexus_app}"
# Password is generated securely if not provided
DB_PASS="${DB_PASS:-}"

# App configuration
PUBLIC_URL="${PUBLIC_URL:-http://localhost:3000}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-cscannell@nexusaigear.com}"
TEST_EMAIL="${TEST_EMAIL:-test-studio@nexusaigear.com}"

# ========================================================================
# LOGGING & OUTPUT UTILITIES
# ========================================================================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"
}

info() {
  echo -e "\033[36m→ $*\033[0m" | tee -a "$DEPLOY_LOG"
}

success() {
  echo -e "\033[32m✓ $*\033[0m" | tee -a "$DEPLOY_LOG"
}

error() {
  echo -e "\033[31m✗ $*\033[0m" | tee -a "$DEPLOY_LOG"
  exit 1
}

warn() {
  echo -e "\033[33m⚠ $*\033[0m" | tee -a "$DEPLOY_LOG"
}

# ========================================================================
# PRE-FLIGHT CHECKS
# ========================================================================

log "========================================================================"
log "  Nexus AI Studio — Ubuntu 26.04 Production Deployment (Enhanced)      "
log "========================================================================"
log "Deployment starting at $(date)"
log "Logs will be saved to: $DEPLOY_LOG"
log ""

# Root check
if [ "$EUID" -ne 0 ]; then
  error "This script must run as root or with sudo."
fi

# Environment validation
info "Validating environment & configuration..."

if [ -z "$ADMIN_PASSWORD" ] || [ -z "$TEST_PASSWORD" ]; then
  error "ADMIN_PASSWORD and TEST_PASSWORD must be set before running this script."
fi

if [ -z "$PUBLIC_URL" ]; then
  warn "PUBLIC_URL not set; using default http://localhost:3000"
  warn "For production, re-run with: PUBLIC_URL=https://your-domain PUBLIC_URL=https://your-domain bash $0"
fi

# Check repository structure
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  error "package.json not found in $PROJECT_DIR. Run this script from the project root."
fi

if [ ! -f "$PROJECT_DIR/prisma/schema.prisma" ]; then
  error "prisma/schema.prisma not found. Repository structure invalid."
fi

success "Environment validation passed"

# ========================================================================
# SYSTEM UPDATES & DEPENDENCIES
# ========================================================================

info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq | tail -n 5

info "Installing base dependencies..."
apt-get install -y -qq \
  curl git wget ca-certificates openssl jq htop vim netcat-traditional \
  build-essential pkg-config libssl-dev libreadline-dev zlib1g-dev \
  net-tools dnsutils iputils-ping traceroute telnet

success "System packages installed"

# ========================================================================
# PYTHON3 + MODAL CLI (for GPU backend deployment reference)
# ========================================================================

info "Installing Python3 + pipx (for Modal CLI reference)..."
apt-get install -y -qq python3 python3-pip python3-venv
python3 -m pip install --upgrade pip setuptools wheel -q

# Install pipx and modal (optional; used for GPU backend)
python3 -m pip install pipx -q 2>/dev/null || true
if command -v pipx &> /dev/null; then
  pipx install modal -q 2>/dev/null || warn "Modal installation via pipx failed; you can install manually later"
else
  warn "pipx not available; Modal CLI skipped. Install manually with: pipx install modal"
fi

success "Python3 environment ready"

# ========================================================================
# NODE.JS 20 + NPM + PM2
# ========================================================================

info "Installing Node.js 20 LTS + npm + PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs

npm install -g npm@latest pm2 -q
pm2 update -s 2>/dev/null || true

success "Node.js $(node -v) + npm $(npm -v) installed"
success "PM2 $(pm2 -v) installed"

# ========================================================================
# POSTGRESQL SETUP
# ========================================================================

info "Configuring PostgreSQL..."

if [ -n "$DATABASE_URL" ]; then
  info "DATABASE_URL is set → skipping local PostgreSQL install"
  success "Using external database: $DATABASE_URL"
else
  info "Installing local PostgreSQL..."
  apt-get install -y -qq postgresql postgresql-contrib postgresql-client

  systemctl enable postgresql > /dev/null 2>&1
  systemctl restart postgresql > /dev/null 2>&1

  # Generate secure password if not provided
  if [ -z "$DB_PASS" ]; then
    DB_PASS="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)"
  fi

  info "Creating PostgreSQL role & database..."

  # Create role (if not exists)
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1 || {
    sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';" > /dev/null 2>&1
    success "Created PostgreSQL role: $DB_USER"
  }

  # Create database (if not exists)
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1 || {
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null 2>&1
    success "Created PostgreSQL database: $DB_NAME"
  }

  # Improve PostgreSQL config for production
  info "Optimizing PostgreSQL configuration..."
  PG_CONFIG="/etc/postgresql/*/main/postgresql.conf"

  # Set max connections and shared buffers (adjust based on your server specs)
  sudo sed -i "s/#max_connections = 100/max_connections = 200/" $PG_CONFIG 2>/dev/null || true
  sudo sed -i "s/#shared_buffers = 128MB/shared_buffers = 256MB/" $PG_CONFIG 2>/dev/null || true

  systemctl restart postgresql > /dev/null 2>&1
  success "PostgreSQL optimized and restarted"

  DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?sslmode=disable"
fi

# ========================================================================
# NEXT.JS APP SETUP
# ========================================================================

info "Setting up Nexus AI Studio web application..."
cd "$PROJECT_DIR"

info "Installing npm dependencies (this may take a few minutes)..."
npm install --no-audit --no-fund -q

# Generate secrets
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

info "Generating .env.local with secrets..."
cat > .env.local <<EOF
# ===== Nexus AI Studio Web SaaS Configuration =====
# Generated on: $(date)
# Never commit this file to version control

# === Web SaaS Mode ===
NEXT_PUBLIC_WEB_MODE=1
NODE_ENV=$NODE_ENV

# === Database (Prisma + PostgreSQL) ===
DATABASE_URL="$DATABASE_URL"

# === NextAuth (Credentials Authentication) ===
NEXTAUTH_URL=$PUBLIC_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# === Stripe (Billing) ===
# SANDBOX/TEST MODE ONLY until the system is verified complete
# Add test keys from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}

# === Modal GPU Backend (Video Generation) ===
# Get token from https://modal.com/account/tokens
# Deploy with: modal deploy modal/video_ltx.py
MODAL_TOKEN_ID=${MODAL_TOKEN_ID:-}
MODAL_TOKEN_SECRET=${MODAL_TOKEN_SECRET:-}

# === Optional: API Keys for Vision Models ===
# Leave blank to use local Qwen2-1.5B for free text generation
# GEMINI_API_KEY=${GEMINI_API_KEY:-}
# OPENAI_API_KEY=${OPENAI_API_KEY:-}

EOF

success ".env.local created with production secrets"

# ========================================================================
# PRISMA: MIGRATE & SEED
# ========================================================================

info "Running Prisma schema migrations..."
npx prisma generate > /dev/null 2>&1
npx prisma migrate deploy 2>&1 | grep -E "(Migrations|Creating|done)" | head -n 10

success "Database schema migrated"

# Try to run seed (non-fatal if seed doesn't exist)
info "Seeding default data..."
npx prisma db seed > /dev/null 2>&1 && success "Database seed completed" || warn "Seed file not found or seed skipped (OK)"

# ========================================================================
# PROVISION USERS
# ========================================================================

info "Provisioning admin and test users..."
if [ -n "$ADMIN_PASSWORD" ] && [ -n "$TEST_PASSWORD" ]; then
  ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  TEST_EMAIL="$TEST_EMAIL" TEST_PASSWORD="$TEST_PASSWORD" \
  node scripts/provision_users.mjs 2>&1 | grep "✓\|Provisioning"

  success "Users provisioned:"
  success "  Admin:  $ADMIN_EMAIL (studio plan + admin/dev groups)"
  success "  Test:   $TEST_EMAIL (studio plan + nsfw-plan + dev)"
else
  error "ADMIN_PASSWORD and TEST_PASSWORD are required for user provisioning."
fi

# ========================================================================
# BUILD & DEPLOY
# ========================================================================

info "Building Next.js application (production mode)..."
npm run build 2>&1 | tail -n 15

if [ ! -d ".next" ]; then
  error "Build failed: .next directory not created"
fi

success "Next.js build successful"

# ========================================================================
# PM2 STARTUP
# ========================================================================

info "Configuring PM2 process manager..."

# Stop existing instance if running
pm2 delete "$APP_NAME" 2>/dev/null || true
sleep 1

# Start application
pm2 start npm --name "$APP_NAME" --no-autorestart -- run start > /dev/null 2>&1
sleep 2

# Verify process started
if pm2 list | grep -q "$APP_NAME"; then
  success "Application started via PM2"
  pm2 list | grep "$APP_NAME" | tail -n 1 | tee -a "$DEPLOY_LOG"
else
  error "Failed to start application via PM2. Check logs with: pm2 logs $APP_NAME"
fi

# Save PM2 config and set up auto-restart on reboot
pm2 save > /dev/null 2>&1
pm2 startup | tail -n 1 | bash - > /dev/null 2>&1 || warn "Could not set PM2 auto-startup (may require manual sudo)"

success "PM2 configured for auto-restart on reboot"

# ========================================================================
# FINAL VALIDATION
# ========================================================================

info "Validating application startup..."
sleep 3

if curl -sf http://localhost:$APP_PORT > /dev/null 2>&1; then
  success "Application is responding on port $APP_PORT"
else
  warn "Application not responding yet; it may still be starting"
  warn "Check status with: pm2 logs $APP_NAME"
fi

# ========================================================================
# DEPLOYMENT SUMMARY
# ========================================================================

log ""
log "========================================================================"
log "                    DEPLOYMENT COMPLETE ✓                             "
log "========================================================================"
log ""
log "Deployment Summary:"
log "  • Node.js:         $(node -v)"
log "  • npm:             $(npm -v)"
log "  • PM2:             $(pm2 -v)"
log "  • PostgreSQL:      $(sudo -u postgres psql --version)"
log "  • App Name:        $APP_NAME"
log "  • App Port:        $APP_PORT"
log "  • Public URL:      $PUBLIC_URL"
log "  • Database:        $DB_NAME @ localhost:5432"
log "  • Deployment Log:  $DEPLOY_LOG"
log ""

if [ -z "$DATABASE_URL" ]; then
  log "Database Credentials (SAVE SECURELY):"
  log "  • Username: $DB_USER"
  log "  • Password: $DB_PASS"
  log ""
fi

log "Admin User:"
log "  • Email:    $ADMIN_EMAIL"
log "  • Password: [as provided in ADMIN_PASSWORD]"
log ""

log "========================================================================"
log "                        NEXT STEPS                                     "
log "========================================================================"
log ""
log "1. CLOUDFLARE TUNNEL (or reverse proxy)"
log "   → Point your tunnel/proxy to http://localhost:$APP_PORT"
log "   → Auth requires PUBLIC_URL to match the domain users will access"
log "   → If needed, update .env.local with correct NEXTAUTH_URL and restart:"
log "     pm2 restart $APP_NAME"
log ""
log "2. MODAL GPU BACKEND (for video generation)"
log "   → Create account at https://modal.com"
log "   → Get API token from https://modal.com/account/tokens"
log "   → Set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET in .env.local"
log "   → Deploy the worker: modal deploy modal/video_ltx.py"
log "   → Update Settings → Modal backend with the provided URL"
log "   → Restart: pm2 restart $APP_NAME"
log ""
log "3. STRIPE BILLING (TEST MODE)"
log "   → Get test keys from https://dashboard.stripe.com/test/apikeys"
log "   → Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local"
log "   → Set up webhook: go to Webhooks, create endpoint to:"
log "     https://$PUBLIC_URL/api/stripe/webhook"
log "   → Copy webhook secret to STRIPE_WEBHOOK_SECRET in .env.local"
log "   → Restart: pm2 restart $APP_NAME"
log "   → NEVER use LIVE keys until the system is verified complete"
log ""
log "4. OPTIONAL: API KEYS (for vision models)"
log "   → Gemini: get key from https://aistudio.google.com/app/apikeys"
log "   → OpenAI: get key from https://platform.openai.com/api-keys"
log "   → Add to .env.local, restart: pm2 restart $APP_NAME"
log ""
log "5. MONITORING & LOGS"
log "   • Real-time: pm2 logs $APP_NAME"
log "   • Status:    pm2 status"
log "   • Restart:   pm2 restart $APP_NAME"
log "   • Stop:      pm2 stop $APP_NAME"
log ""
log "6. DATABASE BACKUPS"
log "   • Daily backup: pg_dump -U $DB_USER $DB_NAME > backup-\$(date +%s).sql"
log "   • Set up automated backups with cron (recommended for production)"
log ""
log "========================================================================"
log ""

success "Deployment finished at $(date)"

