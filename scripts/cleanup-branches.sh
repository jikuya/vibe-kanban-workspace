#!/bin/bash

# Branch Cleanup Script
# 安全なブランチクリーンアップを実行

set -e

echo "🌿 Git Branch Cleanup Script"
echo "================================"

# 現在のブランチを確認
current_branch=$(git branch --show-current)
echo "📍 現在のブランチ: $current_branch"

# すべてのブランチを表示
echo ""
echo "📋 現在のブランチ一覧:"
git branch -a

echo ""
echo "📋 リモートブランチ一覧:"
git branch -r

# マージ済みのローカルブランチを確認
echo ""
echo "🔍 マージ済みローカルブランチ:"
merged_local=$(git branch --merged | grep -v "main\|master\|develop\|*" | xargs -n 1 | head -10)
if [ -n "$merged_local" ]; then
    echo "$merged_local"
    echo ""
    read -p "これらのマージ済みローカルブランチを削除しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$merged_local" | xargs -n 1 git branch -d
        echo "✅ マージ済みローカルブランチを削除しました"
    fi
else
    echo "マージ済みローカルブランチはありません"
fi

echo ""
echo "🔍 削除済みリモートブランチの参照をクリーンアップ中..."
git remote prune origin
git fetch --prune

echo ""
echo "📊 クリーンアップ後のブランチ状況:"
git branch -a

echo ""
echo "✅ ブランチクリーンアップ完了"
echo ""
echo "🚨 リモートブランチを削除する場合は以下のコマンドを使用："
echo "git push origin --delete <branch-name>"
echo "または GitHub UI から削除してください"