#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
cd /app/apps/api
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "==> Starting API on port 3004..."
cd /app/apps/api
node dist/main &
API_PID=$!

echo "==> Waiting for API to be ready..."
for i in $(seq 1 30); do
  if wget -q --spider http://localhost:3004/api/docs 2>/dev/null; then
    echo "==> API is ready!"
    break
  fi
  sleep 1
done

echo "==> Starting Web on port 3003..."
cd /app
PORT=3003 node server.js &
WEB_PID=$!

cleanup() {
  echo "==> Shutting down..."
  kill $API_PID $WEB_PID 2>/dev/null
  wait $API_PID $WEB_PID 2>/dev/null
  exit 0
}

trap cleanup SIGTERM SIGINT

wait $API_PID $WEB_PID
