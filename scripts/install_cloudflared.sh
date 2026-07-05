#!/bin/bash

#########################################################################
# Cloudflared (Cloudflare Tunnel) Installation and Configuration Script
#########################################################################
# Purpose: Install and configure Cloudflared to expose your local service
#          through a Cloudflare Tunnel
#
# Usage (as root):
#   sudo bash install_cloudflared.sh
#
# This script will:
#   1. Install Cloudflared
#   2. Authenticate with Cloudflare
#   3. Create/configure tunnel
#   4. Route traffic through tunnel
#   5. Enable auto-start on reboot
#
# Configuration:
#   - Local service: http://localhost:3000 (Nexus AI Studio)
#   - Public URL: https://studio.nexusaigear.com
#   - Base domain: nexusaigear.com
#   - Tunnel name: nexus-studio
#
#########################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TUNNEL_NAME="nexus-studio"
LOCAL_SERVICE="http://localhost:3000"
PUBLIC_DOMAIN="studio.nexusaigear.com"
BASE_DOMAIN="nexusaigear.com"
CLOUDFLARE_TOKEN="${CLOUDFLARE_TOKEN:-}"
CONFIG_DIR="/etc/cloudflared"
TUNNEL_LOG="/var/log/cloudflared.log"

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   log_error "This script must be run as root. Use: sudo bash $0"
fi

log_info "Starting Cloudflared Installation and Configuration"
log_info "====================================================="

# ========================================================================
# STEP 1: Check for Cloudflare Token
# ========================================================================
log_info "Step 1: Checking Cloudflare credentials..."

if [ -z "$CLOUDFLARE_TOKEN" ]; then
  log_error "CLOUDFLARE_TOKEN environment variable not set"
  log_info "Usage: CLOUDFLARE_TOKEN='your-token' sudo bash $0"
  exit 1
fi

log_success "Cloudflare token detected"

# ========================================================================
# STEP 2: Update System Packages
# ========================================================================
log_info "Step 2: Updating system packages..."
apt-get update -qq
log_success "System packages updated"

# ========================================================================
# STEP 3: Install Cloudflared
# ========================================================================
log_info "Step 3: Installing Cloudflared..."

# Check if Cloudflared is already installed
if command -v cloudflared &> /dev/null; then
  log_warning "Cloudflared is already installed"
  CURRENT_VERSION=$(cloudflared --version | awk '{print $3}')
  log_info "Current version: $CURRENT_VERSION"
else
  # Install Cloudflared using official method
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  apt-get install -y -qq ./cloudflared.deb
  rm -f cloudflared.deb
  log_success "Cloudflared installed"
fi

# Verify installation
if ! command -v cloudflared &> /dev/null; then
  log_error "Cloudflared installation failed"
fi

INSTALLED_VERSION=$(cloudflared --version | awk '{print $3}')
log_success "Cloudflared version: $INSTALLED_VERSION"

# ========================================================================
# STEP 4: Create Configuration Directory
# ========================================================================
log_info "Step 4: Creating Cloudflared configuration..."

mkdir -p "$CONFIG_DIR"
mkdir -p "$(dirname "$TUNNEL_LOG")"

log_success "Configuration directory created"

# ========================================================================
# STEP 5: Authenticate with Cloudflare
# ========================================================================
log_info "Step 5: Authenticating with Cloudflare..."

# Set up credentials file
CREDENTIALS_FILE="/root/.cloudflared/cert.pem"
mkdir -p "$(dirname "$CREDENTIALS_FILE")"

# Save the token as authentication (using environment variable)
# Cloudflared will authenticate using the token
export CLOUDFLARE_TOKEN="$CLOUDFLARE_TOKEN"

log_success "Cloudflare authentication configured"

# ========================================================================
# STEP 6: Create Tunnel Configuration File
# ========================================================================
log_info "Step 6: Creating tunnel configuration..."

# Create the tunnel configuration file
cat > "$CONFIG_DIR/config.yml" <<EOF
# Cloudflared Tunnel Configuration
# Tunnel Name: $TUNNEL_NAME
# Public Domain: $PUBLIC_DOMAIN
# Local Service: $LOCAL_SERVICE
# Generated: $(date)

# Authentication
tunnel: $TUNNEL_NAME
token: $CLOUDFLARE_TOKEN

# Logging
loglevel: info
logfile: $TUNNEL_LOG

# Ingress rules
ingress:
  # Studio service
  - hostname: $PUBLIC_DOMAIN
    service: $LOCAL_SERVICE
    originRequest:
      # Enable HTTP/2 for better performance
      http2Origin: true
      # Connection timeout
      connectTimeout: 30s
      # TLS verification (should be true in production)
      tlsTimeout: 10s
      # Keep-alive timeout
      tcpKeepAlive: 30s
      # No TLS verification (since localhost is self-signed)
      noTLSVerify: false

  # Catch-all (optional, for subdomains)
  - service: http_status:404

# Advanced settings
warp-routing:
  enabled: false

# Metrics
metrics: 0.0.0.0:7834
EOF

chmod 600 "$CONFIG_DIR/config.yml"
log_success "Tunnel configuration created"

# ========================================================================
# STEP 7: Create systemd Service File
# ========================================================================
log_info "Step 7: Creating systemd service..."

cat > /etc/systemd/system/cloudflared.service <<'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/etc/cloudflared
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared

# Security settings
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/log/cloudflared.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log_success "Systemd service created"

# ========================================================================
# STEP 8: Start Cloudflared Service
# ========================================================================
log_info "Step 8: Starting Cloudflared service..."

# Stop any existing instance
systemctl stop cloudflared 2>/dev/null || true
sleep 1

# Start the service
systemctl start cloudflared

# Wait for service to start
sleep 3

# Check if service started
if systemctl is-active --quiet cloudflared; then
  log_success "Cloudflared service is running"
else
  log_error "Failed to start Cloudflared service"
fi

# ========================================================================
# STEP 9: Enable Auto-Start on Reboot
# ========================================================================
log_info "Step 9: Enabling auto-start..."

systemctl enable cloudflared
log_success "Cloudflared will auto-start on reboot"

# ========================================================================
# STEP 10: Verify Configuration
# ========================================================================
log_info "Step 10: Verifying configuration..."

echo ""
log_success "Verification Results:"
echo "--------------------"

# Check service status
if systemctl is-active --quiet cloudflared; then
  log_success "Cloudflared service is active"
else
  log_warning "Cloudflared service is not active"
fi

# Check if configuration file exists
if [ -f "$CONFIG_DIR/config.yml" ]; then
  log_success "Configuration file exists"
else
  log_error "Configuration file not found"
fi

# Check Cloudflared version
if cloudflared --version &>/dev/null; then
  VERSION=$(cloudflared --version | awk '{print $3}')
  log_success "Cloudflared version: $VERSION"
fi

# Try to get tunnel status
sleep 2
if curl -s http://localhost:7834/metrics &>/dev/null; then
  log_success "Metrics endpoint is responsive"
else
  log_warning "Metrics endpoint not yet responding (may take a moment)"
fi

# ========================================================================
# FINAL SUMMARY
# ========================================================================
echo ""
log_success "============================================"
log_success "Cloudflared Installation Complete!"
log_success "============================================"
echo ""

log_info "Tunnel Configuration Summary:"
echo "  • Tunnel Name: $TUNNEL_NAME"
echo "  • Public Domain: $PUBLIC_DOMAIN"
echo "  • Local Service: $LOCAL_SERVICE"
echo "  • Base Domain: $BASE_DOMAIN"
echo ""

log_info "Access Details:"
echo "  • Public URL: https://$PUBLIC_DOMAIN"
echo "  • Local Service: $LOCAL_SERVICE"
echo "  • Configuration: $CONFIG_DIR/config.yml"
echo "  • Log File: $TUNNEL_LOG"
echo ""

log_info "Service Management:"
echo "  • Status:       systemctl status cloudflared"
echo "  • Start:        systemctl start cloudflared"
echo "  • Stop:         systemctl stop cloudflared"
echo "  • Restart:      systemctl restart cloudflared"
echo "  • View Logs:    journalctl -u cloudflared -f"
echo ""

log_info "Troubleshooting:"
echo "  • View recent logs:      journalctl -u cloudflared -n 50"
echo "  • Full log file:         cat $TUNNEL_LOG"
echo "  • Check tunnel status:   cloudflared tunnel list"
echo "  • Test connection:       curl https://$PUBLIC_DOMAIN"
echo ""

log_success "Installation completed successfully!"

# Wait a bit for tunnel to fully establish
echo ""
log_info "Waiting for tunnel to establish connection..."
sleep 5

# Test the connection
log_info "Testing tunnel connectivity..."
if curl -s -m 5 https://$PUBLIC_DOMAIN > /dev/null 2>&1; then
  log_success "✓ Tunnel is accessible at https://$PUBLIC_DOMAIN"
else
  log_warning "⚠ Tunnel may still be initializing. Give it a moment and try again."
  log_info "  Test with: curl https://$PUBLIC_DOMAIN"
fi

echo ""
log_success "Next Steps:"
echo "  1. Visit https://$PUBLIC_DOMAIN in your browser"
echo "  2. Monitor logs: journalctl -u cloudflared -f"
echo "  3. Check tunnel metrics at http://localhost:7834/metrics"
echo "  4. Update DNS records in Cloudflare dashboard if needed"
echo ""

log_info "Configuration file details:"
echo "  Location: $CONFIG_DIR/config.yml"
echo "  Contains:"
echo "    - Tunnel authentication token"
echo "    - Ingress rules (routing)"
echo "    - Logging configuration"
echo "    - Advanced performance settings"
echo ""

log_success "Cloudflared is ready to serve traffic!"
log_info "For help, visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/"

