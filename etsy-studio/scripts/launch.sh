#!/usr/bin/env sh
# One-click launcher for macOS/Linux: starts the dashboard and opens it in the browser.
cd "$(dirname "$0")/.." || exit 1
command -v node >/dev/null || { echo "Node.js 22.5+ is required: https://nodejs.org"; exit 1; }
( sleep 1; (command -v open >/dev/null && open http://127.0.0.1:3000) || xdg-open http://127.0.0.1:3000 ) >/dev/null 2>&1 &
exec node src/dashboard-server.js
