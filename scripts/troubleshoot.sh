#!/bin/bash
# troubleshoot.sh

echo "🔍 トラブルシューティング..."

# プロセス確認
echo "📊 PM2プロセス:"
pm2 status

# ポート確認
echo "🔌 使用中のポート:"
lsof -i :7842 2>/dev/null || echo "Port 7842: Not in use"
lsof -i :7843 2>/dev/null || echo "Port 7843: Not in use"
lsof -i :7844 2>/dev/null || echo "Port 7844: Not in use"
lsof -i :7845 2>/dev/null || echo "Port 7845: Not in use"

# ログ確認
echo "📝 最新のログ:"
if pm2 list | grep -q online; then
    pm2 logs --lines 20
else
    echo "No PM2 processes running"
fi

# 環境変数確認
echo "🔑 環境変数:"
echo "VIBE_HOME: $VIBE_HOME"
echo "VIBE_WORKSPACE: $VIBE_WORKSPACE"
echo "VIBE_PORT: $VIBE_PORT"
echo "BRIDGE_PORT: $BRIDGE_PORT"

# Node.jsとnpmの確認
echo "🔧 Node.js環境:"
node --version
npm --version
pm2 --version 2>/dev/null || echo "PM2: Not installed"

# 再起動
read -p "サービスを再起動しますか？ (y/n): " restart
if [ "$restart" = "y" ]; then
    pm2 restart all
fi
