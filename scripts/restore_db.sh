#!/bin/bash
set -e

# Change directory to repository root
cd "$(dirname "$0")/.."

# Load DATABASE_URL from .env.local
DATABASE_URL=""
if [ -f .env.local ]; then
  DATABASE_URL=$(grep -E "^DATABASE_URL=" .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env.local"
  exit 1
fi

if [ ! -f prisma/backup.sql ]; then
  echo "Error: prisma/backup.sql does not exist!"
  exit 1
fi

echo "Restoring PostgreSQL database from prisma/backup.sql..."
# Run restore using psql
psql "$DATABASE_URL" -f prisma/backup.sql

echo "Database restore successful!"
