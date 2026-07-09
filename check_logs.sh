#!/bin/bash
su - ubuntu -c "/usr/local/bin/pm2 logs nexus-studio --lines 30 --nostream"
