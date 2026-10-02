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
API_READY=0
for i in $(seq 1 30); do
  if ! kill -0 $API_PID 2>/dev/null; then
    echo "==> ERROR: API process exited during startup. See stack trace above."
    exit 1
  fi
  if wget -q --spider http://localhost:3004/api/docs 2>/dev/null; then
    echo "==> API is ready!"
    API_READY=1
    break
  fi
  sleep 1
done

if [ "$API_READY" -ne 1 ]; then
  echo "==> ERROR: API did not become ready within 30s. Aborting."
  exit 1
fi

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

# Si el API muere, apagamos todo para que el orquestador reinicie el contenedor
# en lugar de quedar un contenedor 'vivo' que solo sirve el web (500 confusos).
while kill -0 $API_PID 2>/dev/null; do
  sleep 2
done
echo "==> ERROR: API process died unexpectedly. Restarting container..."
kill $WEB_PID 2>/dev/null
exit 1
