// bridge.js
// 保存先: ~/vibe-kanban-workspace/scripts/bridge.js

// 必要なモジュールを最初にすべてインポート（変数の巻き上げ問題を回避）
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');

// 環境変数を読み込み（エラーハンドリング強化）
let dotenvLoaded = false;
try {
  const dotenv = require('dotenv');
  const configPath = path.join(__dirname, '..', '.env');
  console.log(`🔧 Loading environment from: ${configPath}`);
  const result = dotenv.config({ path: configPath });
  if (result.error) {
    console.log(`⚠️ dotenv config error: ${result.error.message}`);
  } else {
    console.log('✅ dotenv loaded successfully');
    dotenvLoaded = true;
  }
} catch (error) {
  console.log(`⚠️ dotenv module error: ${error.message}`);
  console.log('📝 Using environment variables directly');
}

// Express関連のモジュールをインポート
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');

// ユーティリティ関数を設定
const execPromise = util.promisify(exec);

// Express アプリケーションの設定
const app = express();
app.use(express.json());

// 設定値の初期化と検証
console.log('🔧 Bridge configuration initialization...');
const VIBE_PORT = 7842;
const BRIDGE_PORT = process.env.BRIDGE_PORT || 7843;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 7844;
const CLAUDE_LOCAL_API = 'http://localhost:7845';
const WORKSPACE = process.env.HOME + '/Repositories/jikuya/vibe-workspace';

// デフォルトプロジェクトID（UUIDv4形式）
const DEFAULT_PROJECT_ID = process.env.VIBE_PROJECT_ID || 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';

console.log(`🔧 Configuration loaded:`);
console.log(`   - VIBE_PORT: ${VIBE_PORT}`);
console.log(`   - BRIDGE_PORT: ${BRIDGE_PORT}`);
console.log(`   - WEBSOCKET_PORT: ${WEBSOCKET_PORT}`);
console.log(`   - WORKSPACE: ${WORKSPACE}`);
console.log(`   - DEFAULT_PROJECT_ID: ${DEFAULT_PROJECT_ID}`);
console.log(`   - dotenv loaded: ${dotenvLoaded}`);

// WebSocketサーバー
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

// Claude Codeローカル実行
async function executeClaudeCode(taskDescription, outputPath) {
  try {
    const { stdout, stderr } = await execPromise(
      `claude-code --local-mode --no-auth "${taskDescription}" --output "${outputPath}"`
    );
    return { success: true, output: stdout, error: stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Claude Codeからのタスク作成（ローカルAPI経由）
app.post('/claude/create-task', async (req, res) => {
  console.log('🔥 Incoming task creation request');
  console.log('🔥 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔥 Request headers:', JSON.stringify(req.headers, null, 2));
  
  const { title, description, priority = 'medium', context, code_snippet, project_id } = req.body;
  
  try {
    const taskPayload = {
      title,
      description,
      priority,
      status: 'todo',
      project_id: project_id || DEFAULT_PROJECT_ID,
      agent: 'claude-code-local',
      metadata: {
        source: 'claude-code-local',
        context,
        code_snippet,
        created_at: new Date().toISOString()
      }
    };

    const vibeResponse = await axios.post(
      `http://localhost:${VIBE_PORT}/api/tasks`,
      taskPayload
    );
    
    // タスクファイルを作成 - 改善されたタスクID取得ロジック
    console.log('🔍 Raw Vibe response:', JSON.stringify(vibeResponse.data, null, 2));
    
    let taskId, taskData;
    
    // 複数の可能なレスポンス形式に対応
    if (vibeResponse.data.data) {
      taskData = vibeResponse.data.data;
      taskId = taskData.id || taskData.task_id;
    } else if (vibeResponse.data.id) {
      taskData = vibeResponse.data;
      taskId = vibeResponse.data.id;
    } else if (vibeResponse.data.task_id) {
      taskData = vibeResponse.data;
      taskId = vibeResponse.data.task_id;
    } else {
      taskData = vibeResponse.data;
      taskId = null;
    }
    
    console.log('🆔 Extracted task ID:', taskId);
    console.log('📊 Task data keys:', taskData ? Object.keys(taskData) : 'null');
    
    if (!taskId) {
      console.error('❌ Task ID not found in response. Response structure:', JSON.stringify(vibeResponse.data, null, 2));
      throw new Error('Task ID not found in server response');
    }
    
    const taskFile = path.join(WORKSPACE, 'tasks', `task-${taskId}.json`);
    await fs.mkdir(path.dirname(taskFile), { recursive: true });
    await fs.writeFile(taskFile, JSON.stringify(taskData, null, 2));
    
    res.json({ success: true, task: taskData });
    console.log(`✅ Task created: #${taskId} - ${title}`);
  } catch (error) {
    console.error('❌ Error creating task:', error.message);
    
    // より詳細なエラー情報をログに出力
    if (error.response) {
      console.error('🔍 Server response status:', error.response.status);
      console.error('🔍 Server response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('🔍 Server response data:', JSON.stringify(error.response.data, null, 2));
      console.error('🔍 Request config:', JSON.stringify({
        url: error.response.config?.url,
        method: error.response.config?.method,
        data: error.response.config?.data
      }, null, 2));
    } else if (error.code) {
      console.error('🔍 Error code:', error.code);
      console.error('🔍 Full error:', error);
    } else {
      console.error('🔍 Unknown error type:', error);
    }
    
    res.status(500).json({ 
      error: error.message,
      details: error.response ? {
        status: error.response.status,
        data: error.response.data,
        requestUrl: error.response.config?.url
      } : { 
        code: error.code,
        type: 'unknown'
      }
    });
  }
});

// タスクの実行（Claude Codeローカル実行）
app.post('/claude/execute-task/:id', async (req, res) => {
  const { id } = req.params;
  const { project_id } = req.body;
  
  try {
    // タスク情報を取得
    const taskResponse = await axios.get(`http://localhost:${VIBE_PORT}/api/tasks/${id}?project_id=${project_id || DEFAULT_PROJECT_ID}`);
    const task = taskResponse.data;
    
    // ステータスを更新
    await axios.patch(`http://localhost:${VIBE_PORT}/api/tasks/${id}`, {
      status: 'in_progress',
      project_id: project_id || DEFAULT_PROJECT_ID
    });
    
    // Claude Codeをローカルで実行
    const outputPath = path.join(WORKSPACE, 'outputs', `task-${id}`);
    const result = await executeClaudeCode(task.description, outputPath);
    
    // 結果を更新
    await axios.patch(`http://localhost:${VIBE_PORT}/api/tasks/${id}`, {
      status: result.success ? 'completed' : 'failed',
      output: result.output,
      error: result.error,
      project_id: project_id || DEFAULT_PROJECT_ID
    });
    
    res.json({ success: result.success, task_id: id, result });
    console.log(`✅ Task #${id} executed: ${result.success ? 'completed' : 'failed'}`);
  } catch (error) {
    console.error(`❌ Error executing task #${id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// タスクの更新
app.patch('/claude/update-task/:id', async (req, res) => {
  const { id } = req.params;
  const { status, output, metrics, project_id } = req.body;
  
  try {
    await axios.patch(
      `http://localhost:${VIBE_PORT}/api/tasks/${id}`,
      { status, output, metrics, project_id: project_id || DEFAULT_PROJECT_ID }
    );
    
    res.json({ success: true });
    console.log(`✅ Task #${id} updated: ${status}`);
  } catch (error) {
    console.error(`❌ Error updating task #${id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// タスクの取得
app.get('/claude/tasks', async (req, res) => {
  const { project_id } = req.query;
  
  try {
    const response = await axios.get(`http://localhost:${VIBE_PORT}/api/tasks?project_id=${project_id || DEFAULT_PROJECT_ID}`);
    const tasks = response.data.data || response.data;
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ヘルスチェックエンドポイント
app.get('/health', async (req, res) => {
  try {
    // Vibeサーバーの接続確認
    const healthCheck = await axios.get(`http://localhost:${VIBE_PORT}/api/tasks?project_id=${DEFAULT_PROJECT_ID}`, {
      timeout: 5000
    });
    
    res.json({
      status: 'healthy',
      bridge_port: BRIDGE_PORT,
      websocket_port: WEBSOCKET_PORT,
      vibe_connection: healthCheck.status === 200 ? 'ok' : 'error',
      workspace_path: WORKSPACE,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      bridge_port: BRIDGE_PORT,
      websocket_port: WEBSOCKET_PORT,
      vibe_connection: 'error',
      workspace_path: WORKSPACE,
      timestamp: new Date().toISOString()
    });
  }
});

// Claude Code ローカルAPI連携
app.post('/claude/local-execute', async (req, res) => {
  const { command, args = [] } = req.body;
  
  try {
    // Claude Codeのローカルコマンドを実行
    const { stdout, stderr } = await execPromise(
      `claude-code --local-mode --command "${command}" ${args.join(' ')}`
    );
    
    res.json({ success: true, output: stdout, error: stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket接続処理
wss.on('connection', (ws) => {
  console.log('🔌 Claude Code connected via WebSocket');
  
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    
    switch (data.action) {
      case 'create_task':
        try {
          const payload = {
            ...data.payload,
            project_id: data.payload.project_id || DEFAULT_PROJECT_ID
          };
          const response = await axios.post(
            `http://localhost:${VIBE_PORT}/api/tasks`,
            payload
          );
          ws.send(JSON.stringify({
            action: 'task_created',
            task: response.data
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            action: 'error',
            message: error.message
          }));
        }
        break;
        
      case 'execute_task':
        try {
          const outputPath = path.join(WORKSPACE, 'outputs', `task-${data.task_id}`);
          const result = await executeClaudeCode(data.description, outputPath);
          ws.send(JSON.stringify({
            action: 'task_executed',
            task_id: data.task_id,
            result
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            action: 'error',
            message: error.message
          }));
        }
        break;
        
      case 'get_tasks':
        try {
          const projectId = data.project_id || DEFAULT_PROJECT_ID;
          const tasks = await axios.get(`http://localhost:${VIBE_PORT}/api/tasks?project_id=${projectId}`);
          const taskList = tasks.data.data || tasks.data;
          ws.send(JSON.stringify({
            action: 'tasks_list',
            tasks: taskList
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            action: 'error',
            message: error.message
          }));
        }
        break;
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Claude Code disconnected');
  });
});

app.listen(BRIDGE_PORT, () => {
  console.log('🚀 ============================================');
  console.log('🚀 VIBE-CLAUDE BRIDGE SERVER STARTED');
  console.log('🚀 ============================================');
  console.log(`🌉 Bridge server running on port ${BRIDGE_PORT}`);
  console.log(`🔌 WebSocket server running on port ${WEBSOCKET_PORT}`);
  console.log(`🤖 Claude Code local API expected on port 7845`);
  console.log(`📂 Workspace: ${WORKSPACE}`);
  console.log(`🆔 Default Project ID: ${DEFAULT_PROJECT_ID}`);
  console.log(`🔗 Vibe server expected at: http://localhost:${VIBE_PORT}`);
  console.log('🚀 ============================================');
  console.log(`📊 Ready to receive requests at: http://localhost:${BRIDGE_PORT}/claude/create-task`);
  console.log('🚀 ============================================');
});