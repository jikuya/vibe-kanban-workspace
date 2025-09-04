# Vibe Kanban Workspace

A comprehensive workspace for Vibe Kanban project with Claude Desktop integration.

## Package Manager

**This project uses npm as the standard package manager.**

Please use the following commands:

```bash
# Install dependencies
npm install

# Start the application
npm start

# Development
npm run dev
```

**Do not use yarn, pnpm, or bun** - stick to npm for consistency across the team.

## Services

### Main Services
- **vibe-kanban** (Port 7842): **Rust-based** Kanban application server
- **vibe-bridge** (Port 7843): Bridge service for Claude Desktop integration
- **WebSocket Server** (Port 7844): Real-time communication

### Process Management
Services are managed by PM2. **The main server now uses the Rust binary `vibe-kanban`:**

```bash
# Start all services (recommended)
./start.sh

# Stop all services
./stop.sh

# Manual PM2 commands
pm2 start ecosystem.config.js
pm2 list
pm2 logs
pm2 restart all
```

### Quick Start Scripts
- `./start.sh`: Start all services with proper configuration
- `./stop.sh`: Stop all services gracefully

### Rust Binary Configuration
The main server has been migrated from Node.js to a Rust-based implementation:

- **Binary location**: `/Users/jikuya/.volta/tools/image/node/20.19.1/bin/vibe-kanban`
- **Port**: 7842 (configured via `PORT` environment variable)
- **PM2 configuration**: Updated in `ecosystem.config.js`
- **Auto-startup**: PM2 configuration saved for system startup

#### Benefits of Rust Implementation:
- **Performance**: Significantly faster than Node.js version
- **Memory efficiency**: Lower memory footprint
- **Reliability**: Better error handling and stability
- **Concurrency**: Native async/await with superior performance

## Claude Desktop Integration

### MCP Server Configuration
The project includes an MCP (Model Context Protocol) server for Claude Desktop integration.

Configuration in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibe-kanban": {
      "command": "node",
      "args": [
        "/Users/jikuya/vibe-kanban-workspace/mcp-server/index.js"
      ],
      "env": {
        "VIBE_KANBAN_PORT": "7842",
        "VIBE_WORKSPACE": "/Users/jikuya/vibe-workspace"
      }
    }
  }
}
```

### Available Tools
- `create_task`: Create new tasks
- `list_tasks`: List existing tasks
- `update_task`: Update task status
- `execute_task`: Execute tasks

## API Endpoints

### Bridge API (Port 7843)
- `POST /claude/create-task` - Create a new task
- `GET /claude/tasks` - List tasks
- `PATCH /claude/update-task/:id` - Update task
- `POST /claude/execute-task/:id` - Execute task

### Main API (Port 7842)
- `GET /api/health` - Health check
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks
- `PATCH /api/tasks/:id` - Update task

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Core settings
VIBE_PROJECT_ID=a2695f64-0f53-43ce-a90b-e7897a59fbbc
VIBE_PORT=7842
BRIDGE_PORT=7843
WEBSOCKET_PORT=7844

# Workspace paths
VIBE_WORKSPACE=/Users/jikuya/Repositories/jikuya/vibe-workspace
WORKSPACE_PATH=/Users/jikuya/Repositories/jikuya/vibe-workspace

# Environment
NODE_ENV=production
AGENT_MODE=local
```

## Development

### Testing the Setup

1. **Test main server:**
   ```bash
   curl http://localhost:7842/api/health
   ```

2. **Test bridge API:**
   ```bash
   curl -X POST "http://localhost:7843/claude/create-task" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Task", "description": "Test description"}'
   ```

3. **Debug Claude Desktop integration:**
   ```bash
   ./debug-claude-desktop.sh
   ```

### Project Structure

```
vibe-kanban-workspace/
├── README.md                 # This file
├── package.json             # npm dependencies
├── ecosystem.config.js      # PM2 configuration
├── .env                     # Environment variables
├── scripts/
│   └── bridge.js           # Bridge service
├── mcp-server/
│   └── index.js            # MCP server for Claude Desktop
├── logs/                   # Application logs
└── config/                 # Configuration files
```

## Troubleshooting

### Common Issues

1. **Services not starting:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.js
   ```

2. **Port conflicts:**
   Check if ports 7842, 7843, 7844 are available:
   ```bash
   lsof -i :7842
   lsof -i :7843
   lsof -i :7844
   ```

3. **Claude Desktop not connecting:**
   Check MCP logs:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp.log
   ```

## Team Guidelines

- Always use npm (never yarn, pnpm, or bun)
- Follow the PR process for any changes
- Test locally before pushing changes
- Keep package-lock.json in version control
- Use consistent coding standards

---

For more information, contact the development team or check the project documentation.