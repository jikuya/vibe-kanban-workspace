// ~/vibe-kanban-workspace/mcp-server/index.js

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const VIBE_KANBAN_API = 'http://localhost:7842/api';
const WORKSPACE = process.env.VIBE_WORKSPACE || path.join(process.env.HOME, 'vibe-workspace');

// デフォルトプロジェクトID（UUIDv4形式）
const DEFAULT_PROJECT_ID = process.env.VIBE_PROJECT_ID || 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';

class VibeKanbanMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vibe-kanban-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupTools();
  }

  setupTools() {
    // Use the correct MCP SDK pattern with request schemas
    const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
    
    // ツールリストハンドラー
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_task',
          description: 'Create a new task in Vibe Kanban',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Task title',
              },
              description: {
                type: 'string',
                description: 'Task description',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Task priority',
                default: 'medium',
              },
              project_id: {
                type: 'string',
                description: 'Project ID (UUID format)',
                default: DEFAULT_PROJECT_ID,
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'list_tasks',
          description: 'List all tasks in Vibe Kanban',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['todo', 'in_progress', 'completed', 'all'],
                default: 'all',
              },
              project_id: {
                type: 'string',
                description: 'Project ID (UUID format)',
                default: DEFAULT_PROJECT_ID,
              },
            },
          },
        },
        {
          name: 'update_task',
          description: 'Update a task status',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID',
              },
              status: {
                type: 'string',
                enum: ['todo', 'in_progress', 'completed'],
                description: 'New status',
              },
              project_id: {
                type: 'string',
                description: 'Project ID (UUID format)',
                default: DEFAULT_PROJECT_ID,
              },
            },
            required: ['task_id', 'status'],
          },
        },
        {
          name: 'execute_task',
          description: 'Execute a task and generate code',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'Task ID to execute',
              },
              project_id: {
                type: 'string',
                description: 'Project ID (UUID format)',
                default: DEFAULT_PROJECT_ID,
              },
            },
            required: ['task_id'],
          },
        },
      ],
    }));

    // ツール実行ハンドラー
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'create_task':
          return await this.createTask(args);
        case 'list_tasks':
          return await this.listTasks(args);
        case 'update_task':
          return await this.updateTask(args);
        case 'execute_task':
          return await this.executeTask(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async createTask({ title, description, priority = 'medium', project_id = DEFAULT_PROJECT_ID }) {
    try {
      const response = await axios.post(`${VIBE_KANBAN_API}/tasks`, {
        title,
        description,
        priority,
        status: 'todo',
        project_id,
        agent: 'claude-desktop',
        created_at: new Date().toISOString(),
      });

      // タスクファイルを作成
      const taskId = response.data.data.id;
      const taskData = response.data.data;
      
      const taskFile = path.join(WORKSPACE, 'tasks', `task-${taskId}.json`);
      await fs.mkdir(path.dirname(taskFile), { recursive: true });
      await fs.writeFile(taskFile, JSON.stringify(taskData, null, 2));

      return {
        content: [
          {
            type: 'text',
            text: `✅ Task created: #${taskId} - ${title}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to create task: ${error.message}`,
          },
        ],
      };
    }
  }

  async listTasks({ status = 'all', project_id = DEFAULT_PROJECT_ID }) {
    try {
      const response = await axios.get(`${VIBE_KANBAN_API}/tasks?project_id=${project_id}`);
      let tasks = response.data.data;

      if (status !== 'all') {
        tasks = tasks.filter(task => task.status === status);
      }

      const taskList = tasks.map(task => 
        `#${task.id} [${task.status}] ${task.title}`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📋 Tasks:\n${taskList}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list tasks: ${error.message}`,
          },
        ],
      };
    }
  }

  async updateTask({ task_id, status, project_id = DEFAULT_PROJECT_ID }) {
    try {
      await axios.patch(`${VIBE_KANBAN_API}/tasks/${task_id}`, {
        status,
        project_id,
        updated_at: new Date().toISOString(),
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Task #${task_id} updated to ${status}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to update task: ${error.message}`,
          },
        ],
      };
    }
  }

  async executeTask({ task_id, project_id = DEFAULT_PROJECT_ID }) {
    try {
      // タスク情報を取得
      const taskResponse = await axios.get(`${VIBE_KANBAN_API}/tasks/${task_id}?project_id=${project_id}`);
      const task = taskResponse.data;

      // ステータスを更新
      await this.updateTask({ task_id, status: 'in_progress', project_id });

      // 出力ディレクトリを作成
      const outputDir = path.join(WORKSPACE, 'outputs', `task-${task_id}`);
      await fs.mkdir(outputDir, { recursive: true });

      // タスク実行結果をファイルに保存
      const outputFile = path.join(outputDir, 'output.md');
      const outputContent = `# Task #${task_id} Execution\n\n## Task: ${task.title}\n\n${task.description}\n\n## Status: Executing...`;
      await fs.writeFile(outputFile, outputContent);

      return {
        content: [
          {
            type: 'text',
            text: `🚀 Executing task #${task_id}: ${task.title}\nOutput will be saved to: ${outputFile}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to execute task: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Vibe Kanban MCP Server running...');
  }
}

// サーバー起動
const server = new VibeKanbanMCPServer();
server.run().catch(console.error);
