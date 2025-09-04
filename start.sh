#!/bin/bash

# Vibe Kanban Workspace Startup Script
# このスクリプトは Rust ベースの vibe-kanban を PM2 で起動します

set -e

# Volta環境変数とPATHを設定
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

# PM2のパスを明示的に設定
PM2_PATH="$HOME/.volta/tools/image/node/20.19.1/bin/pm2"

# PM2が見つからない場合の対策
if ! command -v pm2 &> /dev/null && [ -f "$PM2_PATH" ]; then
    export PATH="$(dirname "$PM2_PATH"):$PATH"
fi

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