#!/usr/bin/env bash
# POSIX helper to start Frontend with env vars
export VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:3001}
export VITE_PORT=${VITE_PORT:-5173}

npm run dev
