#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root_dir"
[[ -f .env ]] || { echo "Missing .env; copy .env.example and configure it." >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source .env
set +a
[[ -d server/node_modules && -d client/node_modules ]] || { echo "Dependencies missing; run scripts/bootstrap.sh." >&2; exit 1; }
api_port="${PORT:-${BACKEND_PORT:-3001}}"
ui_port="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
[[ "$api_port" != "$ui_port" ]] || { echo "Backend and frontend ports must differ." >&2; exit 1; }
for assigned_port in "$api_port" "$ui_port"; do
  if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $assigned_port is already in use." >&2
    exit 1
  fi
done
if [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]]; then
  ./scripts/migrate.sh
  node server/create-admin.js
fi
pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  for pid in "${pids[@]:-}"; do wait "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM
PORT="$api_port" npm --prefix server start & pids+=("$!")
BACKEND_PORT="$api_port" npm --prefix client run dev -- --host "${HOST:-127.0.0.1}" --port "$ui_port" --strictPort & pids+=("$!")
wait
