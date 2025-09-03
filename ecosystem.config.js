// ecosystem.config.js
// 保存先: ~/vibe-kanban-workspace/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'vibe-kanban-server',
      script: 'server.js',
      cwd: process.env.HOME + '/Repositories/jikuya/vibe-kanban-workspace',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 7842,  // 被りにくいポート
        AGENT_MODE: 'local',
        WORKSPACE_PATH: process.env.HOME + '/Repositories/jikuya/vibe-workspace',
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    // Claude Codeは後でインストール後に有効化
    // {
    //   name: 'claude-code-local',
    //   script: 'claude-code',
    //   args: '--local-mode --workspace ' + process.env.HOME + '/vibe-workspace --api-port 7845 --no-auth',
    //   autorestart: true,
    //   watch: false,
    //   env: {
    //     VIBE_INTEGRATION: 'true',
    //     WORKSPACE_PATH: process.env.HOME + '/Repositories/jikuya/vibe-workspace',
    //     LOCAL_API_PORT: 7845  // Claude Code ローカルAPIポート
    //   },
    //   error_file: process.env.HOME + '/Repositories/jikuya/vibe-kanban-workspace/logs/claude-err.log',
    //   out_file: process.env.HOME + '/Repositories/jikuya/vibe-kanban-workspace/logs/claude-out.log'
    // },
    {
      name: 'vibe-bridge',
      script: process.env.HOME + '/Repositories/jikuya/vibe-kanban-workspace/scripts/bridge.js',
      autorestart: true,
      watch: false,
      env: {
        BRIDGE_PORT: 7843,
        WEBSOCKET_PORT: 7844
      }
    }
  ]
};