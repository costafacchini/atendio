#!/bin/sh
set -e

node --require source-map-support/register dist/worker.js &
WORKER_PID=$!

node --require source-map-support/register dist/server.js &
SERVER_PID=$!

wait $WORKER_PID $SERVER_PID
EXIT_CODE=$?

kill $WORKER_PID $SERVER_PID 2>/dev/null || true
exit $EXIT_CODE
