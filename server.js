// server.js - Vibe Kanban Main Server
// 保存先: ~/vibe-kanban-workspace/server.js

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 7842;
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || path.join(process.env.HOME, 'Repositories', 'jikuya', 'vibe-workspace');

// Middleware
app.use(express.json());
app.use(express.static('public')); // Web UI用の静的ファイル

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CORSヘッダーを追加
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ディレクトリ作成確保
async function ensureDirectories() {
  const projectsDir = path.join(WORKSPACE_PATH, 'projects');
  const tasksDir = path.join(WORKSPACE_PATH, 'tasks');
  
  await fs.mkdir(projectsDir, { recursive: true });
  await fs.mkdir(tasksDir, { recursive: true });
  
  console.log(`📁 Workspace directories ensured:`);
  console.log(`   - Projects: ${projectsDir}`);
  console.log(`   - Tasks: ${tasksDir}`);
}

// デフォルトプロジェクト作成
async function createDefaultProject() {
  const projectId = 'a2695f64-0f53-43ce-a90b-e7897a59fbbc';
  const projectPath = path.join(WORKSPACE_PATH, 'projects', `${projectId}.json`);
  
  try {
    await fs.access(projectPath);
    console.log('✅ Default project already exists');
  } catch {
    const defaultProject = {
      id: projectId,
      name: 'Default Project',
      description: 'デフォルトプロジェクト',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await fs.writeFile(projectPath, JSON.stringify(defaultProject, null, 2));
    console.log(`✅ Default project created: ${projectId}`);
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    workspace: WORKSPACE_PATH
  });
});

// Projects API
app.get('/api/projects', async (req, res) => {
  try {
    const projectsDir = path.join(WORKSPACE_PATH, 'projects');
    const files = await fs.readdir(projectsDir);
    const projects = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const projectData = await fs.readFile(path.join(projectsDir, file), 'utf8');
        projects.push(JSON.parse(projectData));
      }
    }
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectPath = path.join(WORKSPACE_PATH, 'projects', `${req.params.id}.json`);
    const projectData = await fs.readFile(projectPath, 'utf8');
    
    res.json({
      success: true,
      data: JSON.parse(projectData)
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const projectId = uuidv4();
    const project = {
      id: projectId,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const projectPath = path.join(WORKSPACE_PATH, 'projects', `${projectId}.json`);
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tasks API
app.get('/api/tasks', async (req, res) => {
  try {
    const { project_id } = req.query;
    const tasksDir = path.join(WORKSPACE_PATH, 'tasks');
    const files = await fs.readdir(tasksDir);
    const tasks = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const taskData = await fs.readFile(path.join(tasksDir, file), 'utf8');
          const task = JSON.parse(taskData);
          
          // プロジェクトIDでフィルタ（指定されている場合）
          if (!project_id || task.project_id === project_id) {
            tasks.push(task);
          }
        } catch (parseError) {
          console.warn(`Skipping invalid task file: ${file}`, parseError.message);
        }
      }
    }
    
    // 作成日時で降順ソート
    tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasksDir = path.join(WORKSPACE_PATH, 'tasks');
    const files = await fs.readdir(tasksDir);
    const tasks = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const taskData = await fs.readFile(path.join(tasksDir, file), 'utf8');
          const task = JSON.parse(taskData);
          
          if (task.project_id === projectId) {
            tasks.push(task);
          }
        } catch (parseError) {
          console.warn(`Skipping invalid task file: ${file}`, parseError.message);
        }
      }
    }
    
    tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error loading project tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const taskFiles = await fs.readdir(path.join(WORKSPACE_PATH, 'tasks'));
    const taskFile = taskFiles.find(f => f.includes(req.params.id));
    
    if (!taskFile) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const taskData = await fs.readFile(path.join(WORKSPACE_PATH, 'tasks', taskFile), 'utf8');
    
    res.json({
      success: true,
      data: JSON.parse(taskData)
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const taskId = uuidv4();
    const task = {
      id: taskId,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const taskPath = path.join(WORKSPACE_PATH, 'tasks', `task-${taskId}.json`);
    await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tasksDir = path.join(WORKSPACE_PATH, 'tasks');
    const files = await fs.readdir(tasksDir);
    const taskFile = files.find(f => f.includes(id));
    
    if (!taskFile) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const taskPath = path.join(tasksDir, taskFile);
    const currentData = await fs.readFile(taskPath, 'utf8');
    const task = JSON.parse(currentData);
    
    const updatedTask = {
      ...task,
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    await fs.writeFile(taskPath, JSON.stringify(updatedTask, null, 2));
    
    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tasksDir = path.join(WORKSPACE_PATH, 'tasks');
    const files = await fs.readdir(tasksDir);
    const taskFile = files.find(f => f.includes(id));
    
    if (!taskFile) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    await fs.unlink(path.join(tasksDir, taskFile));
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Web UIルート（後でHTMLファイルを作成）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle common incorrect URL patterns
app.get('/projects', (req, res) => {
  console.log(`⚠️ Incorrect URL accessed: ${req.url}`);
  console.log('   Redirecting to main page. Use Web UI for proper navigation.');
  res.redirect('/?error=incorrect-url');
});

app.get('/tasks', (req, res) => {
  console.log(`⚠️ Incorrect URL accessed: ${req.url}`);
  console.log('   Redirecting to main page. Use Web UI for proper navigation.');
  res.redirect('/?error=incorrect-url');
});

// Catch specific problematic patterns
app.get(/^\/projects\/[^\/]+\/tasks$/, (req, res) => {
  console.log(`⚠️ Incorrect URL accessed: ${req.url}`);
  console.log('   This should be: /api/projects/{id}/tasks');
  res.redirect('/?error=incorrect-url');
});

// Server startup
async function startServer() {
  try {
    await ensureDirectories();
    await createDefaultProject();
    
    app.listen(PORT, () => {
      console.log('🚀 ============================================');
      console.log('🚀 VIBE KANBAN SERVER STARTED');
      console.log('🚀 ============================================');
      console.log(`🌐 Server running on http://localhost:${PORT}`);
      console.log(`📂 Workspace: ${WORKSPACE_PATH}`);
      console.log(`🎯 API endpoints available:`);
      console.log(`   - GET  /api/health`);
      console.log(`   - GET  /api/projects`);
      console.log(`   - GET  /api/projects/:id`);
      console.log(`   - POST /api/projects`);
      console.log(`   - GET  /api/tasks`);
      console.log(`   - GET  /api/projects/:projectId/tasks`);
      console.log(`   - GET  /api/tasks/:id`);
      console.log(`   - POST /api/tasks`);
      console.log(`   - PATCH /api/tasks/:id`);
      console.log(`   - DELETE /api/tasks/:id`);
      console.log('🚀 ============================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();