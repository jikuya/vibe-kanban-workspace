#!/bin/bash
fswatch -0 ~/vibe-workspace/tasks | while read -d "" event; do
  if [[ $event == *.json ]]; then
    TASK_FILE=$(basename "$event")
    TASK_ID="${TASK_FILE%.json}"
    echo "📝 Processing task: $TASK_ID"
    
    # Claude Codeをローカルモードで実行
    claude-code --local-mode --no-auth --task-file "$event" \
                --output ~/vibe-workspace/outputs/$TASK_ID
    
    # タスクステータスを更新
    curl -X PATCH http://localhost:7842/api/tasks/$TASK_ID \
         -H "Content-Type: application/json" \
         -d '{"status": "completed"}'
  fi
done
