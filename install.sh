#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/kpulik/atlas-company-brain.git"
TARGET="${ATLAS_INSTALL_DIR:-$HOME/atlas-company-brain}"
WITH_CHATGPT=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: install.sh [--with-chatgpt-provider] [--dry-run] [directory]

Installs ATLAS into ~/atlas-company-brain by default. Set ATLAS_INSTALL_DIR
to choose a different default directory.
EOF
}

while (($#)); do
  case "$1" in
    --with-chatgpt-provider) WITH_CHATGPT=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    --*) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) TARGET="$1" ;;
  esac
  shift
done

TARGET="${TARGET/#\~/$HOME}"
if ((DRY_RUN)); then
  printf 'Would install %s into %s\n' "$REPO_URL" "$TARGET"
  printf 'Would create backend/.venv, install Python requirements, run npm ci and npm run build\n'
  if ((WITH_CHATGPT)); then printf 'Would also build chatgpt-provider (macOS only)\n'; fi
  exit 0
fi

for command in git python3 npm; do
  command -v "$command" >/dev/null 2>&1 || { echo "Required command not found: $command" >&2; exit 1; }
done
if ((WITH_CHATGPT)) && [[ "$(uname -s)" != Darwin ]]; then
  echo "The ChatGPT subscription provider build is supported on macOS only." >&2
  exit 1
fi
if [[ -e "$TARGET" ]]; then
  if [[ ! -d "$TARGET" || -n "$(ls -A "$TARGET")" ]]; then
    echo "Install directory exists and is not empty: $TARGET" >&2
    exit 1
  fi
  rmdir "$TARGET"
fi
mkdir -p "$(dirname "$TARGET")"
git clone "$REPO_URL" "$TARGET"

python3 -m venv "$TARGET/backend/.venv"
"$TARGET/backend/.venv/bin/python" -m pip install -r "$TARGET/backend/requirements.txt"
(cd "$TARGET/frontend" && npm ci && npm run build)

if ((WITH_CHATGPT)); then
  (cd "$TARGET/chatgpt-provider" && npm ci && npm run build)
fi

printf '\nATLAS installed at %s\nStart it with: %q/run.sh\n' "$TARGET" "$TARGET"
