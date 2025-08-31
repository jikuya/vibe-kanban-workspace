// bridge.js
// 保存先: ~/vibe-kanban-workspace/scripts/bridge.js

const path = require('path');

// 環境変数を読み込み
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const app = express();
app.use(express.json());

const VIBE_PORT = 7842;
const BRIDGE_PORT = process.env.BRIDGE_PORT || 7843;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 7844;
const CLAUDE_LOCAL_API = 'http://localhost:7845';
const WORKSPACE = process.env.HOME + '/vibe-workspace';

// デフォルトプロジェクトID（UUIDv4形式）
const DEFAULT_PROJECT_ID = process.env.VIBE_PROJECT_ID || 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';

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
    
    // タスクファイルを作成
    const taskId = vibeResponse.data.data?.id || vibeResponse.data.id;
    const taskData = vibeResponse.data.data || vibeResponse.data;
    
    const taskFile = path.join(WORKSPACE, 'tasks', `task-${taskId}.json`);
    await fs.mkdir(path.dirname(taskFile), { recursive: true });
    await fs.writeFile(taskFile, JSON.stringify(taskData, null, 2));
    
    res.json({ success: true, task: taskData });
    console.log(`✅ Task created: #${taskId} - ${title}`);
  } catch (error) {
    console.error('❌ Error creating task:', error.message);
    res.status(500).json({ error: error.message });
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
  console.log(`🌉 Vibe-Claude Bridge running on port ${BRIDGE_PORT}`);
  console.log(`🔌 WebSocket server running on port ${WEBSOCKET_PORT}`);
  console.log(`🤖 Claude Code local API expected on port 7845`);
});