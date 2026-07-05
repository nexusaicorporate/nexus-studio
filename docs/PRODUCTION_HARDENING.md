# Production Hardening Guide — Nexus AI Studio

This guide covers additional security, performance, and operational hardening for production deployments.

> **Note:** The main deployment script (`deploy_ubuntu_26.04_enhanced.sh`) handles basic setup. This guide covers **additional production-grade configurations** recommended after initial deployment.

---

## Table of Contents

1. [Security Hardening](#security-hardening)
2. [Performance Optimization](#performance-optimization)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Backup & Recovery](#backup--recovery)
5. [High Availability](#high-availability)
6. [Compliance & Audit](#compliance--audit)

---

## Security Hardening

### 1. Firewall Configuration (UFW)

```bash
# Enable UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (port 22)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (for reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to PostgreSQL
sudo ufw deny 5432/tcp

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status numbered
```

### 2. Fail2Ban (Brute-Force Protection)

```bash
# Install
sudo apt-get install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit for SSH protection
sudo nano /etc/fail2ban/jail.local
# Find and uncomment/modify:
# [DEFAULT]
# bantime = 3600
# findtime = 600
# maxretry = 5

# [sshd]
# enabled = true
# port = ssh
# logpath = /var/log/auth.log

# Restart
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

### 3. SSH Hardening

```bash
# Backup original config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Add/modify these lines:
# Port 22  # Or custom port like 2222
# PermitRootLogin no
# PubkeyAuthentication yes
# PasswordAuthentication no
# X11Forwarding no
# MaxAuthTries 3
# MaxSessions 5
# ClientAliveInterval 300
# ClientAliveCountInterval 3

# Test config
sudo sshd -t

# Restart SSH
sudo systemctl restart ssh

# Verify
sudo systemctl status ssh
```

### 4. PostgreSQL Security

```bash
# Restrict PostgreSQL to localhost only
sudo nano /etc/postgresql/*/main/postgresql.conf

# Find and modify:
# listen_addresses = 'localhost'
# max_connections = 100
# shared_preload_libraries = 'pg_stat_statements'

# Restart PostgreSQL
sudo systemctl restart postgresql

# Enable encryption for database connections
sudo -u postgres psql -d nexus_studio
# Run: ALTER DATABASE nexus_studio SET sslmode = require;
# Exit: \q
```

### 5. Application Secrets Rotation

```bash
# Rotate NextAuth secret
NEW_SECRET=$(openssl rand -base64 32)
sudo nano /opt/nexus-studio/.env.local
# Replace NEXTAUTH_SECRET with new value
# Save and:

pm2 restart nexus-web

# Log:
echo "Secret rotated at $(date)" >> /var/log/nexus-rotation.log
```

### 6. HTTPS/SSL Configuration

If not using Cloudflare Tunnel:

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify renewal
sudo certbot renew --dry-run
```

### 7. Rate Limiting (Nginx Example)

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/your-domain

# Add rate limiting:
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
    # Login attempts limited to 5 per minute
    location /api/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://localhost:3000;
    }

    # API limited to 100 per minute
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://localhost:3000;
    }

    # Everything else
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Performance Optimization

### 1. Node.js Heap Memory

```bash
# For production servers with limited memory
pm2 stop nexus-web
pm2 start npm --name nexus-web --node-args="--max-old-space-size=2048" -- run start
pm2 save

# For larger deployments (4GB+ RAM)
# --max-old-space-size=4096
```

### 2. PostgreSQL Performance Tuning

```bash
# Connect to database
sudo -u postgres psql -d nexus_studio

# Add indexes for common queries
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_plan ON "User"(plan);
CREATE INDEX idx_chat_user_created ON "Chat"(userId, createdAt DESC);
CREATE INDEX idx_analysis_user_created ON "Analysis"(userId, createdAt DESC);

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Vacuum and analyze
VACUUM ANALYZE;

# Exit
\q
```

### 3. Connection Pooling (PgBouncer)

For high-traffic deployments:

```bash
# Install PgBouncer
sudo apt-get install -y pgbouncer

# Configure
sudo nano /etc/pgbouncer/pgbouncer.ini

# Add:
[databases]
nexus_studio = host=localhost port=5432 user=nexus_app password=<DB_PASS> dbname=nexus_studio

[pgbouncer]
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = plain
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Create userlist
echo '"nexus_app" "password"' | sudo tee /etc/pgbouncer/userlist.txt

# Start
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer

# Update .env.local to use PgBouncer
# DATABASE_URL="postgresql://nexus_app:password@localhost:6432/nexus_studio"

pm2 restart nexus-web
```

### 4. Caching Strategy

Add Redis for session/cache storage:

```bash
# Install Redis
sudo apt-get install -y redis-server

# Configure
sudo nano /etc/redis/redis.conf
# Set:
# maxmemory 512mb
# maxmemory-policy allkeys-lru
# bind 127.0.0.1

# Start
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Note: Update app code to use Redis adapter (future enhancement)
```

### 5. CDN for Static Assets

Configure Cloudflare or similar for:
- Static assets (images, CSS, JS)
- API response caching (where appropriate)

```bash
# In your DNS/Cloudflare:
# 1. Create CNAME for CDN subdomain
# 2. Point static asset requests through CDN
# 3. Set appropriate cache TTLs
```

---

## Monitoring & Alerting

### 1. PM2 Monitoring

```bash
# Connect to PM2 Plus (paid, but free tier available)
pm2 link

# Or set up local monitoring
pm2 monit
```

### 2. Custom Health Check

```bash
# Create health check script
cat > /usr/local/bin/nexus-health-check.sh <<'EOF'
#!/bin/bash
RESPONSE=$(curl -sf http://localhost:3000/api/health || echo "ERROR")
if [ "$RESPONSE" = "ERROR" ]; then
  echo "$(date): Health check failed" >> /var/log/nexus-health.log
  pm2 restart nexus-web
fi
EOF

chmod +x /usr/local/bin/nexus-health-check.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/nexus-health-check.sh") | crontab -
```

### 3. System Monitoring (htop, iostat)

```bash
# Install monitoring tools
sudo apt-get install -y sysstat

# Monitor CPU/disk
iostat -x 5  # Every 5 seconds
vmstat 1     # Every 1 second

# Watch processes
watch -n 5 'ps aux | grep node | head -5'
```

### 4. Log Aggregation (Optional)

For multi-server deployments, consider:

```bash
# Install logrotate for PM2 logs
sudo apt-get install -y logrotate

# Create config
sudo nano /etc/logrotate.d/pm2

# Add:
/root/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}

# Test
sudo logrotate -f /etc/logrotate.d/pm2
```

---

## Backup & Recovery

### 1. Automated Database Backups

```bash
# Create backup directory
sudo mkdir -p /backups/nexus-studio
sudo chown postgres:postgres /backups/nexus-studio

# Create backup script
cat > /usr/local/bin/nexus-backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/nexus-studio"
BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y-%m-%d_%H-%M-%S).sql.gz"

pg_dump -U nexus_app -d nexus_studio | gzip > "$BACKUP_FILE"

# Keep only last 30 days
find $BACKUP_DIR -name "db-*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
EOF

chmod +x /usr/local/bin/nexus-backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/nexus-backup.sh") | crontab -

# Verify
crontab -l | grep nexus-backup
```

### 2. Backup Verification

```bash
# Test restore process (on dev/test server)
gzip -d < /backups/nexus-studio/db-latest.sql.gz | psql -U nexus_app -d nexus_test_restore

# Check row counts
psql -U nexus_app -d nexus_test_restore -c "SELECT * FROM \"User\";"

# Drop test database
dropdb -U postgres nexus_test_restore
```

### 3. Backup Storage

```bash
# Copy to external storage (AWS S3 example)
sudo apt-get install -y awscli

# Configure AWS credentials
aws configure

# Add to backup script
aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/nexus-studio/
```

---

## High Availability

### 1. Load Balancing (Multiple Instances)

For production with multiple servers:

```bash
# Nginx load balancer config
sudo nano /etc/nginx/sites-available/nexus-lb

# Add:
upstream nexus_backend {
    least_conn;
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.example.com;

    location / {
        proxy_pass http://nexus_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Reload
sudo nginx -t && sudo systemctl reload nginx
```

### 2. Session Management

For load-balanced deployments, store sessions in Redis:

```bash
# Install redis adapter (future enhancement to app)
npm install connect-redis redis

# Configure app to use Redis for sessions
# (Code changes needed in NextAuth configuration)
```

### 3. Database Replication

For production databases, consider PostgreSQL streaming replication or managed services (RDS, Render, Supabase).

---

## Compliance & Audit

### 1. Audit Logging

```bash
# Enable PostgreSQL audit logging
sudo -u postgres psql -d nexus_studio

# Create audit table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_email VARCHAR,
    action VARCHAR,
    details JSONB
);

# Create function to log actions
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_email, action, details)
    VALUES ('system', TG_OP, row_to_json(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\q
```

### 2. Access Control

```bash
# Restrict sudo access
sudo nano /etc/sudoers

# Add specific commands for app user
nexus_app ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart pm2
nexus_app ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart postgresql
```

### 3. Security Compliance Checklist

- [ ] HTTPS enabled (Let's Encrypt or Cloudflare)
- [ ] SSH key-based auth only (no passwords)
- [ ] Firewall configured (UFW/iptables)
- [ ] Fail2Ban enabled for brute-force protection
- [ ] Database encryption enabled
- [ ] Regular backups tested
- [ ] Audit logging enabled
- [ ] API rate limiting configured
- [ ] No hardcoded secrets in code
- [ ] Environment variables use strong values
- [ ] Database user has minimal required permissions
- [ ] OS security patches applied

---

## Maintenance Schedule

### Daily
- [ ] Check PM2 status: `pm2 status`
- [ ] Monitor logs: `pm2 logs nexus-web`
- [ ] Check disk space: `df -h`

### Weekly
- [ ] Review security logs: `sudo tail -n 1000 /var/log/auth.log`
- [ ] Verify backups ran successfully
- [ ] Check PostgreSQL query performance
- [ ] Monitor memory usage: `free -h`

### Monthly
- [ ] Security patches: `sudo apt-get update && upgrade`
- [ ] Prune old backups and logs
- [ ] Review firewall rules
- [ ] Test backup restoration
- [ ] Update dependencies: `npm outdated`

### Quarterly
- [ ] Full security audit
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Capacity planning (disk, memory, connections)
- [ ] SSL certificate renewal check

---

## Emergency Procedures

### If Application Crashes

```bash
# Check status
pm2 status

# View error logs
pm2 logs nexus-web --err

# Restart
pm2 restart nexus-web

# If still failing, check database
psql -U nexus_app -d nexus_studio -c "SELECT 1;"

# Rollback if needed
git revert <commit-hash>
npm run build
pm2 restart nexus-web
```

### If Database Fails

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check disk space
df -h

# Attempt restart
sudo systemctl restart postgresql

# If failed, restore from backup
sudo systemctl stop postgresql
sudo -u postgres psql -f /backups/nexus-studio/db-latest.sql
sudo systemctl start postgresql
```

### If Out of Disk Space

```bash
# Find large files
du -sh /*
du -sh /var/log/*

# Clean old logs
sudo journalctl --vacuum=30d

# Clean apt cache
sudo apt-get clean

# Remove old backups (carefully!)
find /backups -name "db-*.sql.gz" -mtime +30 -delete
```

---

## Support Resources

- PM2 Documentation: https://pm2.keymetrics.io/docs
- PostgreSQL Administration: https://www.postgresql.org/docs/
- Ubuntu Server Guide: https://ubuntu.com/server/docs
- OWASP Security: https://owasp.org/www-project-web-security-testing-guide/

---

**Last Updated:** 2026-07-02  
**Stack:** Next.js 14 + NextAuth + Prisma + PostgreSQL + PM2

For questions or issues, refer to `docs/DEPLOYMENT_GUIDE.md` → Troubleshooting section.

