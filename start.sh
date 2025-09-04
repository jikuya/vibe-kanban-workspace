#!/bin/bash

# Vibe Kanban Workspace Startup Script
# このスクリプトは Rust ベースの vibe-kanban を PM2 で起動します

set -e

echo "🚀 Starting Vibe Kanban Workspace..."

# ワーキングディレクトリに移動
cd "$(dirname "$0")"

# ログディレクトリの作成
mkdir -p logs

echo "📋 Current PM2 processes:"
pm2 list

echo "🔧 Starting Rust-based vibe-kanban server (port 7842)..."
pm2 start ecosystem.config.js --only vibe-kanban-server

echo "🌉 Starting vibe-bridge (port 7843)..."
pm2 start ecosystem.config.js --only vibe-bridge

echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ Vibe Kanban Workspace started successfully!"
echo ""
echo "📊 Services:"
echo "   - vibe-kanban server (Rust): http://localhost:7842"
echo "   - vibe-bridge: http://localhost:7843"
echo ""
echo "🔍 To monitor services:"
echo "   pm2 list"
echo "   pm2 logs"
echo "   pm2 monit"
echo ""
echo "🛑 To stop services:"
echo "   pm2 stop all"
echo ""

# プロセス状況を表示
pm2 list