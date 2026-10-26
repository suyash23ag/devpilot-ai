#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Target architecture: $(uname -m)"
echo 'Verify JetPack, MongoDB CPU support and Ollama compatibility using docs/deployment/JETSON-DEPLOYMENT.md.'
if [ "$(uname -m)" != 'aarch64' ]; then echo 'This helper expects an ARM64 Jetson target.'; exit 1; fi
bash scripts/setup.sh
echo 'Start local MongoDB and Ollama using your verified platform installation.'
echo 'Run npm start, then npm run smoke in a second terminal. GPU acceleration is not assumed.'
