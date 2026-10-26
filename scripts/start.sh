#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f frontend/dist/index.html ]; then npm run build; fi
exec npm start
