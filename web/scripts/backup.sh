#!/usr/bin/env bash
# Consistent backup of DATA_DIR (database.json + uploads) with a sha256 manifest.
# Usage: DATA_DIR=/data scripts/backup.sh /path/to/outdir
set -euo pipefail
SRC="${DATA_DIR:?set DATA_DIR}"; OUT="${1:?output dir}"
mkdir -p "$OUT"; TS=$(date -u +%Y%m%dT%H%M%SZ)
STAGE=$(mktemp -d); trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/data"
# database.json is replaced atomically (rename), so a plain copy is a complete snapshot.
cp "$SRC/database.json" "$STAGE/data/database.json"
[ -d "$SRC/uploads" ] && cp -a "$SRC/uploads" "$STAGE/data/uploads"
(cd "$STAGE/data" && find . -type f -print0 | sort -z | xargs -0 sha256sum > ../MANIFEST.sha256)
tar -czf "$OUT/sitepulse-$TS.tar.gz" -C "$STAGE" data MANIFEST.sha256
echo "$OUT/sitepulse-$TS.tar.gz"
