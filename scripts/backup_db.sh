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

echo "Dumping PostgreSQL database to prisma/backup.sql..."
pg_dump "$DATABASE_URL" -F p --clean --if-exists -f prisma/backup.sql

echo "Database dump successful!"
