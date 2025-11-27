#!/bin/zsh
cd "$(dirname "$0")" || exit 1

PORT=${PORT:-4173}
HOST=${HOST:-0.0.0.0}

echo "正在启动需求跟进看板，端口 ${PORT}..."
PORT=$PORT HOST=$HOST node server.js &
SERVER_PID=$!

sleep 1
if command -v open >/dev/null 2>&1; then
  open "http://localhost:${PORT}/index.html"
fi

wait $SERVER_PID
