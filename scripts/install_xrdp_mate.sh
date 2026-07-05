#!/bin/bash

#########################################################################
# xRDP + MATE Desktop Installation and Configuration Script
#########################################################################
# Purpose: Install and configure xRDP with MATE desktop for root and
#          ubuntu user on Ubuntu/Debian systems
#
# Usage (as root):
#   sudo bash install_xrdp_mate.sh
#
# This script will:
#   1. Update system packages
#   2. Install MATE desktop environment
#   3. Install xRDP server
#   4. Create ubuntu user (if not exists)
#   5. Configure xRDP for root user
#   6. Configure xRDP for ubuntu user
#   7. Set MATE as default desktop for both users
#   8. Enable and start xRDP service
#
# Post-installation:
#   - Connect via RDP to: <your-server-ip>:3389
#   - Username: root or ubuntu
#   - Password: as configured
#
#########################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

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

log_info "Starting xRDP + MATE Desktop Installation"
log_info "============================================"

# ========================================================================
# STEP 1: Update System Packages
# ========================================================================
log_info "Step 1: Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
log_success "System packages updated"

# ========================================================================
# STEP 2: Install MATE Desktop Environment
# ========================================================================
log_info "Step 2: Installing MATE desktop environment..."

# Check if MATE is already installed
if dpkg -l | grep -q mate-desktop-environment; then
  log_warning "MATE desktop is already installed"
else
  apt-get install -y -qq mate-desktop-environment mate-desktop-environment-extra
  log_success "MATE desktop environment installed"
fi

# ========================================================================
# STEP 3: Install xRDP Server
# ========================================================================
log_info "Step 3: Installing xRDP server..."

# Check if xRDP is already installed
if command -v xrdp &> /dev/null; then
  log_warning "xRDP is already installed"
else
  apt-get install -y -qq xrdp xrdp-themes
  log_success "xRDP server installed"
fi

# Install additional packages for better xRDP performance
apt-get install -y -qq xserver-xorg-core xserver-xorg-input-all
log_success "Additional xRDP dependencies installed"

# ========================================================================
# STEP 4: Create ubuntu User (if not exists)
# ========================================================================
log_info "Step 4: Setting up ubuntu user..."

if id -u ubuntu &>/dev/null; then
  log_warning "User 'ubuntu' already exists"
  # Ensure home directory exists even if user already exists
  if [ ! -d /home/ubuntu ]; then
    log_info "Creating home directory for existing ubuntu user..."
    mkdir -p /home/ubuntu
    chown ubuntu:ubuntu /home/ubuntu
  fi
else
  log_info "Creating user 'ubuntu'..."
  useradd -m -s /bin/bash -G sudo ubuntu

  # Verify home directory was created
  if [ ! -d /home/ubuntu ]; then
    log_warning "Home directory not created automatically, creating manually..."
    mkdir -p /home/ubuntu
    chown ubuntu:ubuntu /home/ubuntu
    chmod 755 /home/ubuntu
  fi

  # Set password for ubuntu user (generate random password)
  UBUNTU_PASSWORD=$(openssl rand -base64 12)
  echo "ubuntu:$UBUNTU_PASSWORD" | chpasswd

  log_success "User 'ubuntu' created"
  log_info "Ubuntu user password: ${UBUNTU_PASSWORD}"
  log_warning "Save this password securely! It will not be shown again."
fi

# ========================================================================
# STEP 5: Configure xRDP for Root User
# ========================================================================
log_info "Step 5: Configuring xRDP for root user..."

# Create .xsession file for root
cat > /root/.xsession <<'EOF'
#!/bin/bash
export GNOME_SHELL_SESSION=ubuntu
exec /usr/bin/mate-session
EOF

chmod 755 /root/.xsession
log_success "xRDP configured for root user"

# ========================================================================
# STEP 6: Configure xRDP for ubuntu User
# ========================================================================
log_info "Step 6: Configuring xRDP for ubuntu user..."

# Ensure home directory exists
if [ ! -d /home/ubuntu ]; then
  log_warning "Ubuntu home directory missing, creating..."
  mkdir -p /home/ubuntu
  chown ubuntu:ubuntu /home/ubuntu
  chmod 755 /home/ubuntu
fi

# Create .xsession file for ubuntu
cat > /home/ubuntu/.xsession <<'EOF'
#!/bin/bash
export GNOME_SHELL_SESSION=ubuntu
exec /usr/bin/mate-session
EOF

chmod 755 /home/ubuntu/.xsession
chown ubuntu:ubuntu /home/ubuntu/.xsession
log_success "xRDP configured for ubuntu user"

# ========================================================================
# STEP 7: Configure MATE Session for Both Users
# ========================================================================
log_info "Step 7: Configuring MATE session defaults..."

# Update xRDP configuration for better MATE support
if [ -f /etc/xrdp/xrdp.ini ]; then
  # Configure MATE session
  sed -i 's/^session=Xvnc/session=Xorg/g' /etc/xrdp/xrdp.ini
  log_success "xRDP configuration updated"
fi

# Create xinitrc for root if it doesn't exist
if [ ! -f /root/.xinitrc ]; then
  cat > /root/.xinitrc <<'EOF'
#!/bin/bash
export GNOME_SHELL_SESSION=ubuntu
exec /usr/bin/mate-session
EOF
  chmod 755 /root/.xinitrc
fi

# Create xinitrc for ubuntu if it doesn't exist
if [ ! -f /home/ubuntu/.xinitrc ]; then
  # Ensure home directory exists first
  if [ ! -d /home/ubuntu ]; then
    mkdir -p /home/ubuntu
    chown ubuntu:ubuntu /home/ubuntu
    chmod 755 /home/ubuntu
  fi

  cat > /home/ubuntu/.xinitrc <<'EOF'
#!/bin/bash
export GNOME_SHELL_SESSION=ubuntu
exec /usr/bin/mate-session
EOF
  chmod 755 /home/ubuntu/.xinitrc
  chown ubuntu:ubuntu /home/ubuntu/.xinitrc
fi

log_success "MATE session configured"

# ========================================================================
# STEP 8: Configure xRDP Service
# ========================================================================
log_info "Step 8: Configuring xRDP service..."

# Enable xRDP service to start on boot
systemctl enable xrdp
systemctl enable xrdp-sesman
log_success "xRDP service enabled for auto-start"

# Start xRDP service
systemctl restart xrdp
systemctl restart xrdp-sesman
sleep 2

# Verify xRDP is running
if systemctl is-active --quiet xrdp; then
  log_success "xRDP service is running"
else
  log_error "xRDP service failed to start"
fi

# ========================================================================
# STEP 9: Firewall Configuration (if UFW is enabled)
# ========================================================================
log_info "Step 9: Configuring firewall rules..."

if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
  log_info "UFW is enabled. Adding xRDP port..."
  ufw allow 3389/tcp
  log_success "Firewall rule added for xRDP (port 3389)"
else
  log_warning "UFW is not enabled or not installed. Please ensure port 3389 is open."
fi

# ========================================================================
# STEP 10: Verify Installation
# ========================================================================
log_info "Step 10: Verifying installation..."

echo ""
log_info "Verification Results:"
echo "--------------------"

# Check MATE installation
if dpkg -l | grep -q mate-desktop-environment; then
  log_success "MATE desktop environment is installed"
else
  log_error "MATE desktop environment installation failed"
fi

# Check xRDP installation
if dpkg -l | grep -q xrdp; then
  log_success "xRDP is installed"
else
  log_error "xRDP installation failed"
fi

# Check xRDP service
if systemctl is-active --quiet xrdp; then
  log_success "xRDP service is running"
else
  log_error "xRDP service is not running"
fi

# Check root configuration
if [ -f /root/.xsession ]; then
  log_success "Root user xRDP session configured"
else
  log_warning "Root user xRDP session not configured properly"
fi

# Check ubuntu user
if id -u ubuntu &>/dev/null; then
  log_success "Ubuntu user exists"
  if [ -f /home/ubuntu/.xsession ]; then
    log_success "Ubuntu user xRDP session configured"
  else
    log_warning "Ubuntu user xRDP session not configured properly"
  fi
else
  log_error "Ubuntu user does not exist"
fi

# ========================================================================
# FINAL SUMMARY
# ========================================================================
echo ""
log_success "============================================"
log_success "xRDP + MATE Desktop Installation Complete!"
log_success "============================================"
echo ""

log_info "Connection Details:"
echo "  • Server IP: $(hostname -I | awk '{print $1}')"
echo "  • RDP Port: 3389"
echo "  • Available Users:"
echo "    - root (password: as configured during server setup)"
echo "    - ubuntu (password: set during script execution)"
echo ""

log_info "Next Steps:"
echo "  1. Use Remote Desktop Client (Windows) or Remmina (Linux/Mac)"
echo "  2. Connect to: <server-ip>:3389"
echo "  3. Login with username 'root' or 'ubuntu'"
echo "  4. MATE desktop will load automatically"
echo ""

log_info "Useful Commands:"
echo "  • Check xRDP status:     systemctl status xrdp"
echo "  • Restart xRDP:          systemctl restart xrdp"
echo "  • View xRDP logs:        tail -f /var/log/xrdp.log"
echo "  • Change ubuntu password: passwd ubuntu"
echo ""

log_info "Troubleshooting:"
echo "  • If login fails, check: journalctl -xe"
echo "  • If desktop doesn't load, verify MATE: mate-session --version"
echo "  • If port is blocked, check firewall: ufw status"
echo ""

log_success "Installation script completed successfully!"

# Save credentials to a secure file
CREDENTIALS_FILE="/root/xrdp_credentials.txt"
echo "xRDP Installation Credentials" > "$CREDENTIALS_FILE"
echo "=============================" >> "$CREDENTIALS_FILE"
echo "Installation Date: $(date)" >> "$CREDENTIALS_FILE"
echo "Server IP: $(hostname -I | awk '{print $1}')" >> "$CREDENTIALS_FILE"
echo "RDP Port: 3389" >> "$CREDENTIALS_FILE"
echo "" >> "$CREDENTIALS_FILE"
echo "Users Created/Configured:" >> "$CREDENTIALS_FILE"
echo "  • root (existing user)" >> "$CREDENTIALS_FILE"
echo "  • ubuntu (created by script)" >> "$CREDENTIALS_FILE"
echo "" >> "$CREDENTIALS_FILE"
if id -u ubuntu &>/dev/null; then
  echo "Ubuntu User Password: $UBUNTU_PASSWORD" >> "$CREDENTIALS_FILE"
fi
echo "" >> "$CREDENTIALS_FILE"
echo "Desktop Environment: MATE" >> "$CREDENTIALS_FILE"
echo "Session Manager: mate-session" >> "$CREDENTIALS_FILE"

chmod 600 "$CREDENTIALS_FILE"
log_success "Credentials saved to: $CREDENTIALS_FILE"

