#!/bin/bash

echo "=========================================="
echo "🚀 NOVA CLOUD SAFE UPDATE SCRIPT"
echo "=========================================="

echo "1. Preparing for update..."

echo "2. Fetching latest code from GitHub..."
git fetch origin

echo "3. Safely pulling code (Local changes and untracked database are preserved)..."
git pull --rebase --autostash origin main

echo "4. Installing dependencies..."
npm install --silent

echo "5. Building the frontend..."
npm run build

echo "6. Restarting backend process..."
pm2 restart all

echo "=========================================="
echo "✅ UPDATE COMPLETE & DATA PRESERVED"
echo "=========================================="
