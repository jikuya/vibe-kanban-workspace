#!/bin/bash
# debug-claude-desktop.sh

echo "🔍 Claude Desktop連携のデバッグ..."

# 設定ファイルの確認
echo "📄 設定ファイルの内容:"
cat "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# MCPサーバーのテスト
echo "🧪 MCPサーバーのテスト:"
cd ~/vibe-kanban-workspace/mcp-server
node index.js --test

# ログの確認
echo "📝 Claude Desktopのログ:"
tail -n 50 ~/Library/Logs/Claude/mcp.log

# ポートの確認
echo "🔌 Vibe Kanbanの状態:"
curl -s http://localhost:7842/api/health || echo "Vibe Kanbanが起動していません"
