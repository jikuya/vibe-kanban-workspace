#!/bin/bash

# Vibe Kanban Workspace Stop Script

set -e

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