#!/bin/bash
chown -R ubuntu:ubuntu /srv/nexus-studio
su - ubuntu -c "/usr/local/bin/pm2 restart all"
