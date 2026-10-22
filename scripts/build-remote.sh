#!/usr/bin/env bash
set -euo pipefail

# 默认构建目标为 android，也可传入 desktop 或 all
TARGET="${1:-android}"
REPO="gaoao-3/Prometheus"
WORKFLOW="build-app.yml"

echo "🚀 [1/3] 正在向 GitHub Actions 下发云端打包任务 (目标: $TARGET)..."
gh workflow run "$WORKFLOW" --repo "$REPO" -f target="$TARGET" -f publish_release=false

echo "⏳ [2/3] 等待任务启动并实时追踪构建进度..."
sleep 5
RUN_ID=$(gh run list --workflow "$WORKFLOW" --repo "$REPO" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "任务 ID: $RUN_ID"
echo "任务看板: https://github.com/$REPO/actions/runs/$RUN_ID"
gh run watch "$RUN_ID" --repo "$REPO"

echo "📦 [3/3] 打包完成！正在全自动下载安装包至 dist/builds/ ..."
mkdir -p dist/builds
gh run download "$RUN_ID" --repo "$REPO" --dir dist/builds/

echo "✨ 搞定！安装包已就绪:"
find dist/builds -type f -name "*.apk" -o -name "*.dmg" -o -name "*.msi" -o -name "*.deb"
