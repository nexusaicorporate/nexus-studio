#!/bin/bash
su - ubuntu -c "cd /srv/nexus-studio; export DATABASE_URL='postgresql://nexus:NexusStudio2025@localhost:5432/nexus_studio?schema=public'; npx prisma db push; /usr/local/bin/pm2 restart all"
