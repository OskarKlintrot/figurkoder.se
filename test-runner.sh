#!/bin/bash

# Simple test runner script for local development
# This script starts the test server and runs Playwright tests

set -e

echo "🚀 Starting test server..."
npm run serve:test &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 5

echo "🧪 Running Playwright tests..."
if npm test; then
    echo "✅ All tests passed!"
    EXIT_CODE=0
else
    echo "❌ Some tests failed!"
    EXIT_CODE=1
fi

echo "🛑 Stopping test server..."
kill $SERVER_PID 2>/dev/null || true

exit $EXIT_CODE