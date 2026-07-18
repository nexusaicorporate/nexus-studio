#!/bin/bash
set -e

# Change directory to repository root
cd "$(dirname "$0")/.."

# 1. Run database dump
bash scripts/backup_db.sh

# 2. Stage database files (Postgres dump + SQLite files)
echo "Staging database files..."
touch audio.sqlite chat.sqlite secret.sqlite
git add prisma/backup.sql audio.sqlite chat.sqlite secret.sqlite

# 3. Commit and push
echo "Checking for database modifications..."
if git diff --cached --quiet; then
  echo "No database changes to commit."
else
  echo "Committing database backup..."
  git commit -m "chore: database backup $(date '+%Y-%m-%d %H:%M:%S')"
  
  echo "Pushing changes to GitHub..."
  git push origin main
  echo "Sync complete!"
fi
