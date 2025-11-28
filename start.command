#!/bin/zsh
cd "$(dirname "$0")" || exit 1

if ! command -v vercel >/dev/null 2>&1; then
  echo "请先安装 Vercel CLI：npm i -g vercel"
  exit 1
fi

if [ ! -f package.json ]; then
  echo "缺少 package.json，请确认仓库完整"
  exit 1
fi

npm install >/tmp/tritrack_npm.log 2>&1

PORT=${PORT:-4173}
echo "使用 vercel dev 启动本地环境，端口 ${PORT}" 
vercel dev --listen "$PORT"
