#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo 'Install Node.js 22.12+ first.'; exit 1; }
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 12)) process.exit(1)'
if [ -f package-lock.json ]; then npm ci; else npm install; fi
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
npm run build
echo 'Application built. Start MongoDB and Ollama, pull llama3.2:1b, then run npm start.'
