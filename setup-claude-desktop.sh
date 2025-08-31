#!/bin/bash
# setup-claude-desktop.sh

echo "🤖 Claude Desktop連携設定を開始します..."

# Claude Desktop設定ファイルのパス
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# 設定ディレクトリを作成
mkdir -p "$CLAUDE_CONFIG_DIR"

# 現在のユーザー名を取得
USERNAME=$(whoami)

# Claude Desktop設定を作成
cat > "$CLAUDE_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "vibe-kanban": {
      "command": "node",
      "args": [
        "/Users/$USERNAME/vibe-kanban-workspace/mcp-server/index.js"
      ],
      "env": {
        "VIBE_KANBAN_PORT": "7842",
        "VIBE_WORKSPACE": "/Users/$USERNAME/vibe-workspace"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "/Users/$USERNAME/vibe-workspace"
      ]
    }
  }
}
EOF

echo "✅ Claude Desktop設定ファイルを作成しました: $CLAUDE_CONFIG_FILE"

# MCPサーバーのセットアップ
echo "📦 MCPサーバーをセットアップしています..."
cd ~/vibe-kanban-workspace/mcp-server
npm install

echo "✅ セットアップが完了しました！"
echo ""
echo "📝 次の手順:"
echo "1. Claude Desktopを再起動してください"
echo "2. Claude Desktopの左下に⚡アイコンが表示されることを確認"
echo "3. アイコンをクリックして'vibe-kanban'が表示されることを確認"
