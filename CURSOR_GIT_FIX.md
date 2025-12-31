# CursorでGit Pushできない問題の解決方法

## 問題の原因

GitHubのPush Protectionが、Git履歴に含まれている認証情報ファイル（Google Cloud Service Account key）を検出して、プッシュをブロックしていました。

## 正しい解決方法

### 1. .gitignoreで認証情報ファイルを無視する（既に設定済み）

`.gitignore`に以下が含まれています：

```
# Google Service Account keys
*-*.json
!package*.json
```

これにより、`ai-pulse-*-*.json`のような認証情報ファイルは無視されます。

### 2. 過去のコミットから認証情報を削除

誤ってコミットしてしまった場合は、Git履歴から削除する必要があります：

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch *-*.json" \
  --prune-empty --tag-name-filter cat -- --all
```

その後、強制プッシュ：
```bash
git push --force
```

**注意**: 強制プッシュは破壊的操作なので、共同作業中のブランチでは使用しないでください。

### 3. 現在のワークスペースに認証情報ファイルが含まれていないことを確認

```bash
git status
```

認証情報ファイル（`*-*.json`）が表示されないことを確認してください。

## 環境変数の警告について

`cursor_snap_ENV_VARS`のパースエラーは、Cursorのシェル初期化時の警告のみで、コマンドの実行には影響ありません。

## まとめ

- **認証情報ファイルは絶対にGitにコミットしない**
- `.gitignore`で適切に設定する
- 誤ってコミットしてしまった場合は、Git履歴から削除する
- GitHubのPush Protectionは、このような問題を防ぐための重要なセキュリティ機能です
