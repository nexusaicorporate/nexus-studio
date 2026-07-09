#!/bin/bash
su - ubuntu -c "cd /srv/nexus-studio; npm run build; /usr/local/bin/pm2 restart nexus-studio"
