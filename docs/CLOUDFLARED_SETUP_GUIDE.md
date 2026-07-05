# Cloudflared Tunnel Setup Guide

This guide covers installing and configuring Cloudflare Tunnel (cloudflared) for **Nexus AI Studio** on your production server.

---

## Overview

Cloudflare Tunnel allows you to securely expose your local application (running on `localhost:3000`) to the internet without opening firewall ports. It creates an outbound connection from your server to Cloudflare's network, routing traffic through Cloudflare's infrastructure.

**What this guide covers:**
- Installing cloudflared on Ubuntu 26.04
- Authenticating with Cloudflare using an access token
- Configuring a tunnel to expose `localhost:3000`
- Setting up DNS records
- Auto-starting the tunnel on system reboot
- Monitoring and troubleshooting
- Advanced configurations and security

---

## Prerequisites

Before starting, ensure you have:

- [ ] Cloudflare account with a domain registered
- [ ] Domain delegated to Cloudflare nameservers
- [ ] Cloudflare API token with tunnel creation permissions
- [ ] SSH access to your Ubuntu 26.04 server (as root or with sudo)
- [ ] Nexus AI Studio running on `localhost:3000`
- [ ] At least 50MB disk space available
- [ ] Network connectivity to `api.cloudflare.com`

---

## Authentication

### Obtaining a Cloudflare API Token

You have two authentication options:

#### Option 1: API Token (Recommended for Tunnel)
1. Log in to Cloudflare Dashboard
2. Navigate to **Profile → API Tokens**
3. Click **Create Token**
4. Use the **"Edit Cloudflare Workers"** template or create custom with these permissions:
   - Account - Cloudflare Tunnel - Edit
   - Zone - Zone Settings - Read (for your domain)
5. Copy the token for use in the script

#### Option 2: Global API Key (Less Secure)
1. Navigate to **Profile → API Tokens**
2. Under "API Keys" section, view Global API Key
3. Copy your API key

**Important:** Store your token securely. Never commit it to version control.

---

## Installation

### Step 1: SSH into Your Server

```bash
ssh root@your-server-ip
cd /opt/nexus-studio
```

### Step 2: Make the Script Executable

```bash
chmod +x scripts/install_cloudflared.sh
```

### Step 3: Run the Installation Script

```bash
# Set the token as an environment variable
export CLOUDFLARE_TOKEN='your-api-token-here'

# Run the script
sudo bash scripts/install_cloudflared.sh
```

The script will:
1. Update system packages
2. Install cloudflared
3. Configure authentication
4. Create tunnel configuration
5. Set up systemd service
6. Enable auto-start on reboot
7. Test connectivity

**Expected output:**
```
[✓] Cloudflared Installation Complete!
[✓] Tunnel is accessible at https://studio.nexusaigear.com
```

**Installation time: 2-5 minutes**

---

## Configuration Details

### Configuration File

The script creates a configuration file at:
```
/etc/cloudflared/config.yml
```

**Contents:**
```yaml
tunnel: nexus-studio
token: [your-cloudflare-token]
logfile: /var/log/cloudflared.log
loglevel: info

ingress:
  - hostname: studio.nexusaigear.com
    service: http://localhost:3000
    originRequest:
      http2Origin: true
      connectTimeout: 30s
      tcpKeepAlive: 30s
      noTLSVerify: false
  
  - service: http_status:404
```

### Port Mapping

- **Local Service:** `http://localhost:3000` (Nexus AI Studio)
- **Public Domain:** `https://studio.nexusaigear.com`
- **Cloudflare Port:** Auto (uses standard HTTPS)

---

## DNS Configuration

### Setting Up DNS Records

After the tunnel is running, you need to configure DNS records in Cloudflare:

1. **Log in to Cloudflare Dashboard**
2. **Select your domain** (nexusaigear.com)
3. **Go to DNS Records**
4. **Add a CNAME record:**
   - **Name:** `studio`
   - **Target:** `nexus-studio.cfargotunnel.com` (or as provided by cloudflared)
   - **Proxy Status:** Proxied (orange cloud)
   - **TTL:** Auto

5. **Save and wait** for DNS propagation (usually 1-5 minutes)

### Verifying DNS

```bash
# Check if DNS resolves
nslookup studio.nexusaigear.com

# Should return Cloudflare's IP addresses
```

---

## Testing the Tunnel

### Test 1: Local Connection

```bash
# From the server
curl http://localhost:3000

# Should return HTML from Nexus AI Studio
```

### Test 2: Public Access

```bash
# From any computer
curl https://studio.nexusaigear.com

# Should return the same HTML
```

### Test 3: Browser Access

1. Open your browser
2. Visit: `https://studio.nexusaigear.com`
3. You should see the Nexus AI Studio login page
4. Try logging in with test credentials

---

## Monitoring & Management

### Check Service Status

```bash
# View current status
systemctl status cloudflared

# View real-time logs
journalctl -u cloudflared -f

# View last 50 log lines
journalctl -u cloudflared -n 50
```

### Common Commands

```bash
# Start the tunnel
systemctl start cloudflared

# Stop the tunnel
systemctl stop cloudflared

# Restart the tunnel
systemctl restart cloudflared

# Check if tunnel is running
systemctl is-active cloudflared

# View configuration
cat /etc/cloudflared/config.yml

# View metrics endpoint (may require local access)
curl http://localhost:7834/metrics
```

### Viewing Logs

```bash
# Tail logs in real-time
tail -f /var/log/cloudflared.log

# View last 100 lines
tail -n 100 /var/log/cloudflared.log

# Search for specific errors
grep -i error /var/log/cloudflared.log
```

---

## Troubleshooting

### Issue: Tunnel Won't Start

**Check if cloudflared is running:**
```bash
systemctl status cloudflared
```

**If not running:**
```bash
journalctl -u cloudflared --no-pager | tail -20
```

**Common causes:**
- **Invalid token:** Verify the token in `/etc/cloudflared/config.yml`
- **Connectivity issue:** Check internet connection to `api.cloudflare.com`
- **Port conflict:** Another service may be using port 7834 (metrics)

**Solution:**
```bash
# Restart the service
systemctl restart cloudflared

# Check status again
systemctl status cloudflared
```

### Issue: DNS Not Resolving

**Verify DNS is configured:**
```bash
# Should return Cloudflare IP addresses
nslookup studio.nexusaigear.com

# Or use dig for more details
dig studio.nexusaigear.com
```

**If DNS not resolving:**
1. Check Cloudflare Dashboard → DNS Records
2. Ensure CNAME record exists: `studio → nexus-studio.cfargotunnel.com`
3. Ensure proxy status is "Proxied" (orange cloud)
4. Wait 5-10 minutes for DNS propagation
5. Clear local DNS cache:
   ```bash
   # On Linux
   sudo systemctl restart systemd-resolved
   ```

### Issue: Connection Timeout (HTTPS)

**Verify tunnel is running:**
```bash
curl http://localhost:3000
```

**If local connection works but HTTPS fails:**
1. Verify DNS is configured (see above)
2. Check Cloudflare Dashboard for tunnel status
3. Restart cloudflared: `systemctl restart cloudflared`

**Try accessing directly:**
```bash
# If you know the tunnel URL
curl -v https://studio.nexusaigear.com
```

### Issue: 502 Bad Gateway

**Means tunnel is running but can't reach local service.**

**Solutions:**
```bash
# 1. Verify local service is running
curl http://localhost:3000

# If not running, start it:
pm2 start nexus-web  # Or your PM2 service name

# 2. Check if port 3000 is open
netstat -tlnp | grep 3000

# 3. Check firewall
sudo ufw status

# 4. Restart tunnel
systemctl restart cloudflared
```

### Issue: High Latency or Slowness

**Monitor tunnel health:**
```bash
# View metrics
curl http://localhost:7834/metrics

# Check resource usage
top -p $(pgrep -f cloudflared)

# Monitor bandwidth
nethogs eth0  # Or your network interface
```

**Optimization:**
1. Ensure Nexus AI Studio has adequate resources
2. Check PostgreSQL performance
3. Review logs for errors: `journalctl -u cloudflared -f`

---

## Advanced Configuration

### Custom Ingress Rules

For multiple services, edit `/etc/cloudflared/config.yml`:

```yaml
ingress:
  # Route API subdomain to port 8000
  - hostname: api.studio.nexusaigear.com
    service: http://localhost:8000
  
  # Route admin subdomain to port 3001
  - hostname: admin.studio.nexusaigear.com
    service: http://localhost:3001
  
  # Default route
  - hostname: studio.nexusaigear.com
    service: http://localhost:3000
  
  # Catch-all
  - service: http_status:404
```

After editing, restart:
```bash
systemctl restart cloudflared
```

### Custom Log Levels

Edit `/etc/cloudflared/config.yml`:

```yaml
# Options: debug, info, warning, error
loglevel: debug  # More verbose logging
```

### TLS Settings

For advanced TLS configuration:

```yaml
ingress:
  - hostname: studio.nexusaigear.com
    service: http://localhost:3000
    originRequest:
      # Minimum TLS version (default: 1.0)
      tlsVersion: 1.2
      # Ciphers (if needed)
      disableChunkedEncoding: false
```

### Rate Limiting

Configure at Cloudflare Dashboard (not in local config):
1. Go to **Rules → Rate Limiting**
2. Create rules for your domain
3. Set thresholds and actions

---

## Security Considerations

### 1. API Token Security

```bash
# Never commit token to git
echo "token: secret-token-123" >> .gitignore

# Store token securely
# Only expose to running process (via environment variable)
export CLOUDFLARE_TOKEN='your-token'

# For file-based storage, restrict permissions
chmod 600 /etc/cloudflared/config.yml
```

### 2. Access Control

**Use Cloudflare's built-in features:**
- **Rate Limiting:** Prevent brute-force attacks
- **WAF Rules:** Block malicious requests
- **IP Allowlist:** Restrict by country or IP range
- **JWT Validation:** Require authentication tokens

**Configure in Cloudflare Dashboard:**
1. Go to **Rules → WAF**
2. Add rules to block threats
3. Set rate limits on login endpoints

### 3. Monitoring & Alerts

**View traffic in Cloudflare Dashboard:**
1. **Analytics → Traffic**
2. Set up alerts for suspicious activity
3. Monitor error rates

**Local monitoring:**
```bash
# Watch real-time logs
journalctl -u cloudflared -f | grep -i error

# Check for repeated errors
grep -i error /var/log/cloudflared.log | tail -10
```

### 4. Tunnel Redundancy

For production deployments, consider:
- Multiple tunnel instances behind a load balancer
- Failover tunnels on backup servers
- Health checks and auto-recovery

### 5. Firewall Configuration

Even with tunnel, ensure firewall is hardened:

```bash
# Block direct access to port 3000 (only tunnel should access)
sudo ufw deny 3000/tcp

# Allow SSH (tunnel doesn't need port 22 public)
sudo ufw allow 22/tcp
```

---

## Maintenance

### Regular Tasks

#### Daily
- [ ] Check tunnel status: `systemctl status cloudflared`
- [ ] Monitor logs for errors: `journalctl -u cloudflared -f`

#### Weekly
- [ ] Verify public access: `curl https://studio.nexusaigear.com`
- [ ] Check DNS resolution: `nslookup studio.nexusaigear.com`
- [ ] Review Cloudflare Dashboard for anomalies

#### Monthly
- [ ] Check for cloudflared updates
- [ ] Review security rules in Cloudflare
- [ ] Rotate API tokens if needed
- [ ] Test failover/recovery procedures

### Updating Cloudflared

```bash
# Check current version
cloudflared --version

# Update cloudflared
sudo apt-get update
sudo apt-get install --only-upgrade cloudflared

# Restart tunnel
systemctl restart cloudflared

# Verify update
cloudflared --version
```

### Log Rotation

Cloudflared logs can grow large. Set up rotation:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/cloudflared

# Add:
/var/log/cloudflared.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}

# Test
sudo logrotate -f /etc/logrotate.d/cloudflared
```

---

## Uninstalling Cloudflared

If you need to remove cloudflared:

```bash
# Stop the service
sudo systemctl stop cloudflared
sudo systemctl disable cloudflared

# Remove package
sudo apt-get remove cloudflared

# Remove configuration
sudo rm -rf /etc/cloudflared/

# Remove logs
sudo rm -f /var/log/cloudflared.log

# Remove systemd service
sudo rm -f /etc/systemd/system/cloudflared.service
sudo systemctl daemon-reload
```

---

## Integration with Nexus AI Studio

### Deployment Workflow

1. **Deploy application:**
   ```bash
   sudo PUBLIC_URL=https://studio.nexusaigear.com \
        ADMIN_PASSWORD='...' \
        TEST_PASSWORD='...' \
        bash scripts/deploy_ubuntu_26.04_enhanced.sh
   ```

2. **Install cloudflared:**
   ```bash
   export CLOUDFLARE_TOKEN='your-token'
   sudo bash scripts/install_cloudflared.sh
   ```

3. **Verify access:**
   ```bash
   # Check local service
   curl http://localhost:3000
   
   # Check public tunnel
   curl https://studio.nexusaigear.com
   ```

4. **Configure DNS** (Cloudflare Dashboard):
   - Add CNAME: `studio → nexus-studio.cfargotunnel.com`

---

## Support & Resources

### Documentation
- Cloudflare Tunnels: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- cloudflared CLI: https://github.com/cloudflare/cloudflared

### Troubleshooting Resources
- Cloudflare Community: https://community.cloudflare.com/
- GitHub Issues: https://github.com/cloudflare/cloudflared/issues

### Getting Help

**If you need help:**

1. Check logs: `journalctl -u cloudflared -n 100`
2. Verify configuration: `cat /etc/cloudflared/config.yml`
3. Test connectivity: `curl http://localhost:3000`
4. Check Cloudflare Dashboard for tunnel status

**Report issues with:**
- Error message (from logs)
- Configuration (sanitized)
- Steps to reproduce
- System information: `uname -a`, `cloudflared --version`

---

## Verification Checklist

After installation, verify:

- [ ] `systemctl status cloudflared` shows "active (running)"
- [ ] `journalctl -u cloudflared` shows successful startup
- [ ] `curl http://localhost:3000` returns HTML
- [ ] `curl https://studio.nexusaigear.com` returns HTML
- [ ] DNS resolves: `nslookup studio.nexusaigear.com`
- [ ] Cloudflare Dashboard shows tunnel "Connected"
- [ ] You can access `https://studio.nexusaigear.com` in browser
- [ ] Login works with test credentials

---

## Next Steps

1. ✅ Install cloudflared using the provided script
2. ✅ Configure DNS in Cloudflare Dashboard
3. ✅ Verify public access works
4. Set up monitoring alerts in Cloudflare
5. Configure WAF rules for security
6. Set up rate limiting on login endpoint
7. Enable logging for audit trail

---

**Version:** 1.0  
**Last Updated:** 2026-07-02  
**Tested On:** Ubuntu 26.04 LTS, Debian 11+

For issues, see Troubleshooting section or consult Cloudflare documentation.


