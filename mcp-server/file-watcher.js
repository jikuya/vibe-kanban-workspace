const fs = require('fs');
const path = require('path');
const { watch } = require('fs/promises');

class FileWatcher {
  constructor(workspace) {
    this.workspace = workspace;
    this.tasksDir = path.join(workspace, 'tasks');
    this.outputsDir = path.join(workspace, 'outputs');
  }

  async watchTasks() {
    const watcher = watch(this.tasksDir, { recursive: true });
    
    for await (const event of watcher) {
      if (event.filename.endsWith('.json')) {
        console.log(`Task file changed: ${event.filename}`);
        // Claude Desktopに通知を送る処理
        await this.notifyClaudeDesktop(event);
      }
    }
  }

  async notifyClaudeDesktop(event) {
    // WebSocketやIPCで通知を送る
    console.log(`Notifying Claude Desktop about: ${event.filename}`);
  }
}

module.exports = FileWatcher;
