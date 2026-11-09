#!/usr/bin/env bash
# Verifies a backup archive without touching live data: checksums + database parses.
# Usage: scripts/restore-verify.sh archive.tar.gz
set -euo pipefail
A="${1:?archive}"; D=$(mktemp -d); trap 'rm -rf "$D"' EXIT
tar -xzf "$A" -C "$D"
(cd "$D/data" && sha256sum -c ../MANIFEST.sha256 >/dev/null)
node -e "const d=JSON.parse(require('fs').readFileSync('$D/data/database.json','utf8'));console.log('database ok, collections:',Object.keys(d).length)"
echo "RESTORE-VERIFY OK"
