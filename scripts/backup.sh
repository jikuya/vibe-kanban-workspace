#!/bin/bash
BACKUP_DIR="$HOME/vibe-kanban-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/vibe-kanban-backup-$TIMESTAMP.tar.gz" \
    --exclude='node_modules' \
    --exclude='logs' \
    "$VIBE_HOME" "$VIBE_WORKSPACE" "$HOME/.vibe-kanban"

find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
echo "✅ Backup completed: $BACKUP_DIR/vibe-kanban-backup-$TIMESTAMP.tar.gz"
