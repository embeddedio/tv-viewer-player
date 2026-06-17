#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
UI_DIR="$ROOT_DIR/server/views"
SRC="$ROOT_DIR/server"
DST="$ROOT_DIR/nodejs-assets/nodejs-project"

if [ ! -d "$SRC" ]; then
  echo "Le dossier serveur est introuvable: $SRC" >&2
  exit 1
fi

# Build admin UI if views/ exists
if [ -d "$UI_DIR" ] && [ -f "$UI_DIR/package.json" ]; then
  echo "Building admin UI..."
  cd "$UI_DIR" && npm install && npm run build && cd "$ROOT_DIR"
fi

rm -rf "$DST"
mkdir -p "$(dirname "$DST")"

# Copy server/ excluding views/, runtime data, and uploaded files.
# Widgets are NOT bundled — they live in external storage (Documents/tv-viewer/widgets/)
# and are discovered at runtime by the server.
rsync -a \
  --exclude='/views/' \
  --exclude='data/sequences.json' \
  --exclude='data/config.json' \
  --exclude='data/metadata.json' \
  --exclude='data/auth.json' \
  --exclude='storage-path.json' \
  --exclude='uploads/*.png' \
  --exclude='uploads/*.jpg' \
  --exclude='uploads/*.jpeg' \
  --exclude='uploads/*.gif' \
  --exclude='uploads/*.mp4' \
  --exclude='uploads/*.webm' \
  --exclude='uploads/*.mp3' \
  --exclude='uploads/*.wav' \
  "$SRC/" "$DST/"

echo "Serveur copié dans nodejs-assets/nodejs-project"
