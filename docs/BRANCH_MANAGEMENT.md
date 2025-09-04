# ブランチ管理ガイドライン

## 概要

このドキュメントは、プロジェクトのGitブランチを効率的に管理するためのガイドラインとツールを提供します。

## ブランチ命名規則

### 推奨命名パターン

```
feature/[issue-number]-[brief-description]
bugfix/[issue-number]-[brief-description]
hotfix/[brief-description]
chore/[brief-description]
```

### 例
- `feature/123-user-authentication`
- `bugfix/456-login-error`
- `hotfix/security-patch`
- `chore/update-dependencies`

## 自動化ツール

### 1. ブランチクリーンアップスクリプト
```bash
./scripts/cleanup-branches.sh
```
- マージ済みローカルブランチの安全な削除
- リモート参照のクリーンアップ

### 2. ブランチ監査スクリプト
```bash
./scripts/branch-audit.sh
```
- ブランチ統計情報の表示
- 古いブランチの検出
- クリーンアップ推奨事項の提示

### 3. 便利なGitエイリアス
```bash
git cleanup-merged    # マージ済みブランチを一括削除
git branch-status     # ブランチを最終更新日順で表示
```

## GitHub設定

### 自動ブランチ削除
- ✅ PRマージ後のブランチ自動削除が有効
- 設定場所: Settings > General > "Automatically delete head branches"

### ブランチ保護ルール（推奨）
```
main branch:
- Require pull request reviews
- Require status checks to pass
- Dismiss stale reviews when new commits are pushed
```

## 定期メンテナンス

### 週次タスク
- [ ] `./scripts/branch-audit.sh` を実行
- [ ] 不要なローカルブランチの確認と削除
- [ ] リモートブランチの状況確認

### 月次タスク
- [ ] 長期間使われていないブランチの整理
- [ ] チーム間でのブランチ利用状況の確認
- [ ] 命名規則の遵守状況チェック

## ベストプラクティス

### ブランチ作成時
1. 最新のmainブランチから分岐
2. 明確で簡潔な命名
3. 単一の機能・修正に集中

### 作業中
1. 定期的なコミット
2. わかりやすいコミットメッセージ
3. 必要に応じてリベース

### PR作成時
1. ブランチの目的を明確に記述
2. 関連するIssueをリンク
3. レビューアーを適切に指定

### マージ後
1. ローカルブランチの削除（自動化推奨）
2. 関連するIssueのクローズ
3. 次のタスクへの移行

## トラブルシューティング

### よくある問題と解決方法

#### 問題: リモートで削除されたブランチがローカルに残っている
```bash
git remote prune origin
git fetch --prune
```

#### 問題: マージされていないブランチを削除したい
```bash
git branch -D <branch-name>  # 注意：変更が失われる可能性
```

#### 問題: リモートブランチが多すぎる
```bash
# GitHub UI または以下のコマンドで削除
git push origin --delete <branch-name>
```

## 緊急時の対応

### 重要なブランチを誤って削除した場合
```bash
git reflog                    # 削除したブランチのコミットハッシュを確認
git checkout -b <branch-name> <commit-hash>  # ブランチを復旧
```

### リポジトリが重くなった場合
```bash
git gc --prune=now           # ガベージコレクション実行
git repack -ad               # パックファイルの最適化
```

## 参考リンク

- [Git Branch Management Best Practices](https://git-scm.com/book/en/v2/Git-Branching-Branch-Management)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Gitflow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)

---

最終更新: $(date +%Y-%m-%d)