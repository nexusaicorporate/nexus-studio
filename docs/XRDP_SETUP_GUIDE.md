# xRDP + MATE Desktop Setup Guide

This guide covers installing and configuring xRDP (Remote Desktop Protocol) with MATE desktop environment on your Ubuntu/Debian server.

---

## Overview

xRDP allows you to connect to your server's desktop using Remote Desktop Protocol (RDP), similar to Windows Remote Desktop. MATE is a lightweight, user-friendly desktop environment perfect for server use.

**What this script does:**
- ✅ Installs MATE desktop environment
- ✅ Installs and configures xRDP server
- ✅ Creates the `ubuntu` user (if it doesn't exist)
- ✅ Configures xRDP for both `root` and `ubuntu` users
- ✅ Sets MATE as the default desktop session
- ✅ Enables xRDP to auto-start on reboot
- ✅ Configures firewall rules (if UFW is enabled)

---

## Pre-Installation Checklist

- [ ] Server is accessible via SSH
- [ ] Running Ubuntu 20.04+ or Debian 10+
- [ ] Have root/sudo access
- [ ] At least 20GB disk space available
- [ ] 2GB+ RAM available
- [ ] Have an RDP client available (see below)

---

## RDP Clients

### Windows
- **Remote Desktop Connection** (built-in)
  - Search for "Remote Desktop Connection" in Start Menu
  - Or: Press `Windows Key + R`, type `mstsc`

### macOS
- **Microsoft Remote Desktop** (free from App Store)
- **Screens** (paid, more features)
- **Remmina** (free, open source)

### Linux
- **Remmina** (most popular)
  ```bash
  sudo apt-get install remmina remmina-plugin-rdp
  ```
- **GNOME Boxes** (if using GNOME)

---

## Installation Steps

### Step 1: Download and Prepare the Script

```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to the scripts directory
cd /opt/nexus-studio/scripts

# Make the script executable
chmod +x install_xrdp_mate.sh
```

### Step 2: Run the Installation Script

```bash
# Run as root (the script will check this)
sudo bash install_xrdp_mate.sh

# Or if you're already root:
bash install_xrdp_mate.sh
```

### Step 3: Monitor the Installation

The script will:
1. Update system packages (~2-3 minutes)
2. Install MATE desktop (~5-10 minutes)
3. Install xRDP (~1-2 minutes)
4. Configure both users (~1 minute)
5. Start services (~1 minute)
6. Display summary (~1 minute)

**Total time: ~10-17 minutes**

### Step 4: Verify Installation

After the script completes, you should see:
```
✓ MATE desktop environment is installed
✓ xRDP is installed
✓ xRDP service is running
✓ Root user xRDP session configured
✓ Ubuntu user exists
✓ Ubuntu user xRDP session configured
```

The script will also display:
- Server IP address
- RDP port (3389)
- Available users (root and ubuntu)
- Ubuntu user password (save this!)

---

## Connecting via RDP

### Connection Details

- **Server Address:** `<your-server-ip>:3389`
- **Username:** `root` or `ubuntu`
- **Password:** As set during installation

### Windows (Remote Desktop Connection)

1. Open Remote Desktop Connection (`mstsc`)
2. Enter: `your-server-ip:3389`
3. Click "Connect"
4. Enter username: `root` or `ubuntu`
5. Enter password
6. Click "OK"
7. MATE desktop will load

### macOS (Microsoft Remote Desktop)

1. Open Microsoft Remote Desktop
2. Click "Add PC"
3. Enter PC name: `your-server-ip:3389`
4. Enter username: `root` or `ubuntu`
5. Click "Add"
6. Double-click to connect
7. Enter password when prompted

### Linux (Remmina)

1. Open Remmina
2. Click "New" (+ icon)
3. Set:
   - Name: `My Server`
   - Protocol: `RDP`
   - Server: `your-server-ip:3389`
   - Username: `root` or `ubuntu`
4. Click "Save"
5. Double-click to connect
6. Enter password when prompted

---

## Post-Installation Configuration

### 1. Set ubuntu User Password

If you need to change the ubuntu user password:

```bash
# Log in as root via SSH
ssh root@your-server-ip

# Change ubuntu user password
sudo passwd ubuntu

# Enter and confirm new password
```

### 2. Configure MATE Settings

After connecting via RDP and logging in:

1. Click "Applications" menu
2. Go to "System" → "Control Center"
3. Customize:
   - Desktop appearance
   - Keyboard shortcuts
   - Power management
   - Display resolution

### 3. Enable Audio (Optional)

If you want audio support in RDP sessions:

```bash
# Install PulseAudio support for xRDP
sudo apt-get install -y pulseaudio pulseaudio-module-xrdp

# Restart xRDP
sudo systemctl restart xrdp
```

### 4. Customize Desktop

For both root and ubuntu users, create `.xsession` files with custom startup:

```bash
# For root user
sudo nano /root/.xsession

# Add your custom startup commands
# Example:
# #!/bin/bash
# export GNOME_SHELL_SESSION=ubuntu
# exec /usr/bin/mate-session
```

---

## Troubleshooting

### Issue: Cannot Connect to RDP Server

**Check if xRDP is running:**
```bash
sudo systemctl status xrdp

# If not running, start it:
sudo systemctl restart xrdp
```

**Check if port 3389 is open:**
```bash
sudo netstat -tlnp | grep 3389

# If UFW is enabled, ensure rule exists:
sudo ufw status | grep 3389
```

**Check firewall:**
```bash
# If using UFW
sudo ufw allow 3389/tcp
sudo systemctl restart ufw

# If using iptables
sudo iptables -A INPUT -p tcp --dport 3389 -j ACCEPT
```

### Issue: Login Fails

**Check xRDP logs:**
```bash
tail -f /var/log/xrdp.log
```

**Verify user exists:**
```bash
# For root
su - root -c "echo 'Root login OK'"

# For ubuntu
su - ubuntu -c "echo 'Ubuntu login OK'"
```

**Check if MATE session is broken:**
```bash
# Verify MATE is installed
apt list --installed | grep mate

# If missing, reinstall:
sudo apt-get install mate-desktop-environment
```

### Issue: Desktop Environment Doesn't Load

**Check MATE session manager:**
```bash
mate-session --version
```

**Verify .xsession file:**
```bash
# For root
cat /root/.xsession

# For ubuntu
cat /home/ubuntu/.xsession
```

Both should contain:
```bash
#!/bin/bash
export GNOME_SHELL_SESSION=ubuntu
exec /usr/bin/mate-session
```

### Issue: Low Resolution or Display Issues

**Adjust resolution in RDP client settings before connecting.**

After connecting, adjust in MATE:
1. Right-click desktop
2. Select "Desktop" preferences
3. Go to "Window Scaling"
4. Adjust zoom level

### Issue: Performance is Slow

**Optimize xRDP settings:**

```bash
# Edit xRDP configuration
sudo nano /etc/xrdp/xrdp.ini

# Adjust these settings:
# [Global]
# max_bpp=24
# [xvnc]
# delay_ms=20
```

**Kill unnecessary background processes:**
```bash
# View running processes
ps aux

# Kill unused applications
pkill -f "<application-name>"
```

---

## Management Commands

### Check xRDP Status
```bash
sudo systemctl status xrdp
```

### Restart xRDP
```bash
sudo systemctl restart xrdp
```

### Stop xRDP
```bash
sudo systemctl stop xrdp
```

### View xRDP Logs
```bash
# Real-time logs
sudo tail -f /var/log/xrdp.log

# Last 50 lines
sudo tail -n 50 /var/log/xrdp.log
```

### View Session Manager Logs
```bash
tail -f /var/log/syslog | grep xrdp
```

### Disable xRDP from Auto-start
```bash
sudo systemctl disable xrdp
sudo systemctl disable xrdp-sesman
```

### Enable xRDP Auto-start
```bash
sudo systemctl enable xrdp
sudo systemctl enable xrdp-sesman
```

---

## Security Considerations

### 1. Use Strong Passwords

For both root and ubuntu users:
```bash
# Password requirements:
# - Minimum 12 characters
# - Mix of uppercase, lowercase, numbers, symbols
# - Not dictionary words
```

### 2. Restrict Port 3389

If you only connect from specific IPs:

```bash
# Allow only from specific IP (using UFW)
sudo ufw allow from 192.168.1.100 to any port 3389

# For multiple IPs
sudo ufw allow from 192.168.1.0/24 to any port 3389
```

### 3. Use SSH Tunneling (Advanced)

For extra security, tunnel RDP through SSH:

```bash
# From your client machine
ssh -L 3390:localhost:3389 root@your-server-ip

# Then connect RDP client to: localhost:3390
```

### 4. Consider VPN

For production servers:
- Access server only through VPN
- Restrict RDP to VPN subnet only
- Use strong VPN credentials

### 5. Monitor Connections

```bash
# View active RDP sessions
who

# View failed login attempts
sudo grep "pam_unix" /var/log/auth.log | grep "authentication failure"
```

---

## Advanced Configuration

### Custom Startup Script

Create a custom startup script that runs when users log in:

```bash
# For ubuntu user
cat > /home/ubuntu/.xprofile <<'EOF'
#!/bin/bash
# Custom startup script
# Add your startup commands here
export DISPLAY=:10  # Adjust as needed
/usr/bin/mate-power-manager &
/usr/bin/mate-screensaver &
EOF

chmod +x /home/ubuntu/.xprofile
chown ubuntu:ubuntu /home/ubuntu/.xprofile
```

### Keyboard Layout

To change keyboard layout:

```bash
# Set keyboard layout (for all users)
sudo nano /etc/X11/xorg.conf

# Add or modify:
# Section "InputClass"
#     Identifier "keyboard"
#     MatchIsKeyboard "on"
#     Option "XkbLayout" "us"  # or "de", "fr", "es", etc.
# EndSection
```

### Multiple Displays/Monitors

To support multiple monitors:

```bash
# Ensure xrandr is installed
sudo apt-get install -y x11-xserver-utils

# Check available displays
xrandr

# Configure in RDP client before connecting (usually automatic)
```

---

## Credentials File

The installation script saves a credentials file at:
```
/root/xrdp_credentials.txt
```

**Contents:**
- Installation date
- Server IP
- RDP port
- Available users
- Ubuntu user password (if created)

**To view:**
```bash
sudo cat /root/xrdp_credentials.txt
```

---

## Uninstallation (If Needed)

If you need to remove xRDP:

```bash
# Stop xRDP services
sudo systemctl stop xrdp
sudo systemctl stop xrdp-sesman

# Disable auto-start
sudo systemctl disable xrdp
sudo systemctl disable xrdp-sesman

# Remove xRDP packages
sudo apt-get remove -y xrdp xrdp-themes
sudo apt-get autoremove -y

# Optional: Remove MATE desktop
# sudo apt-get remove -y mate-desktop-environment

# Remove firewall rules
sudo ufw delete allow 3389/tcp

# Remove configuration files
sudo rm -rf /root/.xsession
sudo rm -rf /home/ubuntu/.xsession
sudo rm -rf /etc/xrdp/
```

---

## Support & Help

### Useful Resources

- MATE Project: https://mate-desktop.org/
- xRDP Project: http://xrdp.org/
- Ubuntu MATE: https://ubuntu-mate.org/

### Common Commands

```bash
# System information
hostnamectl
uname -a

# Check disk space
df -h

# Check RAM usage
free -h

# Check network configuration
ip a

# Check xRDP version
xrdp --version
```

---

## FAQ

**Q: Can I use the same credentials for both root and ubuntu?**
A: Yes, but it's recommended to use different passwords for security.

**Q: Does xRDP work with SSH keys?**
A: xRDP uses username/password authentication only. SSH keys don't apply to RDP.

**Q: Can I limit RDP connections to specific users?**
A: Yes, by modifying `/etc/xrdp/sesman.ini` and creating `.xsession` files selectively.

**Q: Is xRDP secure for production?**
A: For production, use UFW to restrict port 3389 to known IPs, or tunnel through VPN/SSH.

**Q: Can I run applications in the RDP session?**
A: Yes, MATE supports all standard Linux applications.

**Q: How many simultaneous RDP connections can I have?**
A: By default, multiple users can connect, but each gets their own session.

---

## Next Steps

1. Run the installation script
2. Save the credentials file
3. Connect via RDP from your client machine
4. Customize MATE desktop settings
5. Install additional applications as needed
6. Configure security settings (firewall, VPN, etc.)

---

**Installation Script Location:** `scripts/install_xrdp_mate.sh`

**Version:** 1.0  
**Last Updated:** 2026-07-02  
**Tested On:** Ubuntu 20.04+, Ubuntu 22.04+, Ubuntu 24.04+, Debian 11+

