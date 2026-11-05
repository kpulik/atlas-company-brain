#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$ROOT/backend/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "ATLAS is not installed. Run install.sh first." >&2
  exit 1
fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Frontend dependencies are missing. Run install.sh again." >&2
  exit 1
fi

backend_pid=
frontend_pid=
cleanup() {
  [[ -z "${frontend_pid:-}" ]] || kill "$frontend_pid" 2>/dev/null || true
  [[ -z "${backend_pid:-}" ]] || kill "$backend_pid" 2>/dev/null || true
  [[ -z "${frontend_pid:-}" ]] || wait "$frontend_pid" 2>/dev/null || true
  [[ -z "${backend_pid:-}" ]] || wait "$backend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$ROOT/backend" && exec "$PYTHON" -m uvicorn app:app --host 127.0.0.1 --port 8000) &
backend_pid=$!
(cd "$ROOT/frontend" && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --strictPort) &
frontend_pid=$!
printf 'ATLAS API: http://127.0.0.1:8000\nDashboard: http://127.0.0.1:5173\nPress Ctrl-C to stop both services.\n'
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
