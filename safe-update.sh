#!/bin/bash

echo "=========================================="
echo "🚀 NOVA CLOUD SAFE UPDATE SCRIPT"
echo "=========================================="

echo "1. Stashing any accidental tracking changes..."
git stash --quiet

echo "2. Fetching latest code from GitHub..."
git fetch origin

echo "3. Safely resetting codebase (Untracked database is safe!)..."
git reset --hard origin/main

echo "4. Installing dependencies..."
npm install --silent

echo "5. Building the frontend..."
npm run build

echo "6. Restarting backend process..."
pm2 restart all

echo "=========================================="
echo "✅ UPDATE COMPLETE & DATA PRESERVED"
echo "=========================================="
