#!/bin/bash

# Vibe Kanban Workspace Stop Script

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

echo "🛑 Stopping Vibe Kanban Workspace..."

# ワーキングディレクトリに移動
cd "$(dirname "$0")"

echo "📋 Current PM2 processes:"
pm2 list

echo "🔧 Stopping vibe-kanban server..."
pm2 stop vibe-kanban-server 2>/dev/null || echo "vibe-kanban-server not running"

echo "🌉 Stopping vibe-bridge..."
pm2 stop vibe-bridge 2>/dev/null || echo "vibe-bridge not running"

echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ Vibe Kanban Workspace stopped successfully!"
echo ""
echo "🔍 To check status:"
echo "   pm2 list"
echo ""
echo "🚀 To restart services:"
echo "   ./start.sh"
echo ""

# プロセス状況を表示
pm2 list