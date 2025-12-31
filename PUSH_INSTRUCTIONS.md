# GitHubにプッシュする方法

Cursorのシェルで問題が発生する場合、以下の方法でプッシュできます。

## 方法1: npmスクリプトを使用（推奨）

```bash
npm run git:push
```

## 方法2: スクリプトを直接実行

```bash
bash scripts/push-to-github.sh
```

## 方法3: システムのターミナルで実行

Cursorの統合ターミナルではなく、macOSのTerminal.appなどで実行：

```bash
cd /Users/tsuruta-air/Documents/dev/ai-pulse
bash scripts/push-to-github.sh
```

## 手動で実行する場合

```bash
cd /Users/tsuruta-air/Documents/dev/ai-pulse

git add .
git commit -m "Migrate to Cloudflare Pages + D1 + R2"
git remote add cloudflare https://github.com/room8inc/ai-pulse-cloudflare.git 2>/dev/null || git remote set-url cloudflare https://github.com/room8inc/ai-pulse-cloudflare.git 2>/dev/null || true
git push -u cloudflare main
```

