#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PURGE_DATA=0
DRY_RUN=0
usage() {
  cat <<'EOF'
Usage: uninstall.sh [--purge-data] [--dry-run]

Removes generated Python and frontend build dependencies. Preserves the
database, settings, source checkout, and any other user data by default.
--purge-data explicitly removes backend/atlas.sqlite3 after confirmation.
EOF
}
while (($#)); do
  case "$1" in
    --purge-data) PURGE_DATA=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if ((DRY_RUN)); then
  printf 'Would remove only: %s/backend/.venv %s/frontend/node_modules %s/frontend/dist %s/chatgpt-provider/node_modules %s/chatgpt-provider/dist\n' "$ROOT" "$ROOT" "$ROOT" "$ROOT" "$ROOT"
  if ((PURGE_DATA)); then printf 'Would additionally offer to remove: %s/backend/atlas.sqlite3\n' "$ROOT"; fi
  exit 0
fi

for path in "$ROOT/backend/.venv" "$ROOT/frontend/node_modules" "$ROOT/frontend/dist" "$ROOT/chatgpt-provider/node_modules" "$ROOT/chatgpt-provider/dist"; do
  [[ ! -e "$path" ]] || rm -rf -- "$path"
done

if ((PURGE_DATA)) && [[ -f "$ROOT/backend/atlas.sqlite3" ]]; then
  printf 'Permanently delete ATLAS database %s? Type DELETE to confirm: ' "$ROOT/backend/atlas.sqlite3"
  IFS= read -r answer
  if [[ "$answer" == DELETE ]]; then
    rm -- "$ROOT/backend/atlas.sqlite3"
    echo 'Database deleted.'
  else
    echo 'Database preserved.'
  fi
fi
echo 'Generated dependencies removed. Source and other data preserved.'
