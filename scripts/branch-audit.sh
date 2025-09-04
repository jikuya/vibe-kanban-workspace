#!/bin/bash

# Branch Audit Script
# 定期的なブランチ監査とレポート生成

set -e

echo "📊 Git Branch Audit Report"
echo "=========================="
echo "Date: $(date)"
echo ""

# 統計情報
total_local=$(git branch | wc -l)
total_remote=$(git branch -r | wc -l)
current_branch=$(git branch --show-current)

echo "📈 ブランチ統計:"
echo "  - ローカルブランチ: $total_local"
echo "  - リモートブランチ: $total_remote" 
echo "  - 現在のブランチ: $current_branch"
echo ""

# 古いブランチの検出 (30日以上更新されていない)
echo "⏰ 古いブランチ (30日以上更新なし):"
git for-each-ref --format='%(refname:short) %(committerdate:relative)' refs/heads/ \
  --sort='-committerdate' | while read branch date rest; do
    if [[ "$date" =~ "months ago" ]] || [[ "$date" =~ "year" ]] || [[ "$date" =~ "[3-9] weeks" ]]; then
        echo "  🕒 $branch - $date $rest"
    fi
done

echo ""

# マージ済みブランチ
echo "✅ マージ済みブランチ:"
merged_branches=$(git branch --merged main | grep -v "main\|master\|\*" | xargs -n 1 2>/dev/null || true)
if [ -n "$merged_branches" ]; then
    echo "$merged_branches" | while read branch; do
        echo "  ✓ $branch"
    done
else
    echo "  なし"
fi

echo ""

# 未マージブランチ  
echo "🔄 未マージブランチ:"
unmerged_branches=$(git branch --no-merged main | grep -v "main\|master\|\*" | xargs -n 1 2>/dev/null || true)
if [ -n "$unmerged_branches" ]; then
    echo "$unmerged_branches" | while read branch; do
        last_commit_date=$(git log -1 --format="%cr" "$branch" 2>/dev/null || echo "不明")
        echo "  🔄 $branch - 最終更新: $last_commit_date"
    done
else
    echo "  なし"
fi

echo ""

# リモート追跡の確認
echo "🔗 リモート追跡の健全性:"
git branch -vv | while read line; do
    if [[ "$line" =~ "gone]" ]]; then
        branch_name=$(echo "$line" | awk '{print $1}' | sed 's/\*//')
        echo "  ❌ 削除済みリモートを追跡: $branch_name"
    fi
done

echo ""
echo "🛠️  推奨アクション:"
echo "1. マージ済みブランチの削除を検討"
echo "2. 古いブランチの用途を確認"
echo "3. 'gone' 状態のブランチをクリーンアップ"
echo "4. 不要なリモートブランチの削除"

echo ""
echo "📋 クリーンアップコマンド例:"
echo "  git branch -d <merged-branch>     # マージ済みブランチ削除"
echo "  git remote prune origin           # 削除済みリモート参照をクリーンアップ"
echo "  git push origin --delete <branch> # リモートブランチ削除"