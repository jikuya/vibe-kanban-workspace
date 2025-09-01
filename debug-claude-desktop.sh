#!/bin/bash
# debug-claude-desktop.sh - Claude Desktopのタスク作成問題をデバッグ

echo "🔧 Claude Desktop - Vibe Kanban Debug Script"
echo "=============================================="

# 1. 実行中のサービス確認
echo "📊 Running Services:"
echo "-------------------"
echo "PM2 processes:"
pm2 list

echo -e "\nNode processes:"
ps aux | grep -E "(node|vibe)" | grep -v grep | head -10

# 2. API接続テスト
echo -e "\n🔗 API Connection Tests:"
echo "------------------------"

# Vibe API直接テスト
echo "Testing Vibe API (7842):"
curl -s -X GET "http://localhost:7842/api/projects" | jq -r '.data[] | "  - \(.name): \(.id)"' || echo "  ❌ Vibe API connection failed"

# Bridge API テスト
echo "Testing Bridge API (7843):"
curl -s -X GET "http://localhost:7843/health" | jq -r '. | "  Status: \(.status), Vibe Connection: \(.vibe_connection)"' || echo "  ❌ Bridge API connection failed"

# 3. プロジェクト設定確認
echo -e "\n🎯 Project Configuration:"
echo "-------------------------"
echo "Bridge Default Project ID: $(grep 'DEFAULT_PROJECT_ID.*=' /Users/jikuya/Repositories/jikuya/vibe-kanban-workspace/scripts/bridge.js | cut -d"'" -f2)"
echo "MCP Default Project ID: $(grep 'DEFAULT_PROJECT_ID.*=' /Users/jikuya/Repositories/jikuya/vibe-kanban-workspace/mcp-server/index.js | cut -d"'" -f2)"

# 4. Claude Desktop設定確認
echo -e "\n🖥️ Claude Desktop Configuration:"
echo "--------------------------------"
if [ -f "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ]; then
    echo "Configuration file exists:"
    jq -r '.mcpServers."vibe-kanban"' "$HOME/Library/Application Support/Claude/claude_desktop_config.json" 2>/dev/null || echo "  ❌ vibe-kanban MCP server not configured"
else
    echo "  ❌ Claude Desktop config file not found"
fi

# 5. ワークスペース確認
echo -e "\n📂 Workspace Status:"
echo "-------------------"
WORKSPACE="$HOME/vibe-workspace"
echo "Workspace path: $WORKSPACE"
if [ -d "$WORKSPACE" ]; then
    echo "  ✅ Workspace directory exists"
    echo "  Tasks directory: $(ls -la "$WORKSPACE/tasks" 2>/dev/null | wc -l) files"
else
    echo "  ⚠️ Creating workspace directory..."
    mkdir -p "$WORKSPACE/tasks" "$WORKSPACE/outputs"
fi

# 6. タスク作成テスト
echo -e "\n🧪 Task Creation Test:"
echo "---------------------"
echo "Testing Bridge API task creation:"
RESPONSE=$(curl -s -X POST http://localhost:7843/claude/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Debug Test Task",
    "description": "Testing task creation from debug script"
  }')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TASK_ID=$(echo "$RESPONSE" | jq -r '.task.id')
    echo "  ✅ Task created successfully: $TASK_ID"
    
    # タスクファイル確認
    if [ -f "$WORKSPACE/tasks/task-$TASK_ID.json" ]; then
        echo "  ✅ Task file created in workspace"
    else
        echo "  ⚠️ Task file not found in workspace"
    fi
else
    echo "  ❌ Task creation failed:"
    echo "$RESPONSE" | jq .
fi

# 7. MCPサーバーの起動準備
echo -e "\n🚀 MCP Server Status:"
echo "--------------------"
echo "MCP Server executable: /Users/jikuya/Repositories/jikuya/vibe-kanban-workspace/mcp-server/index.js"
if [ -f "/Users/jikuya/Repositories/jikuya/vibe-kanban-workspace/mcp-server/index.js" ]; then
    echo "  ✅ MCP Server file exists"
    echo "  Configuration:"
    head -20 "/Users/jikuya/Repositories/jikuya/vibe-kanban-workspace/mcp-server/index.js" | grep -E "(BRIDGE_API|DEFAULT_PROJECT_ID)" | sed 's/^/    /'
else
    echo "  ❌ MCP Server file not found"
fi

echo -e "\n🎯 Summary:"
echo "----------"
echo "If all tests above pass, Claude Desktop should be able to create tasks."
echo "Try using the 'create_task' tool in Claude Desktop with:"
echo "  Title: Test from Claude Desktop"
echo "  Description: Testing after configuration fix"
echo ""
echo "If it still fails, check Claude Desktop's logs or try restarting Claude Desktop."