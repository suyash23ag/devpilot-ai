# Deployment architecture

Development runs Vite on loopback 5173 and Express on loopback 5000; Vite proxies `/api`. Production uses `npm run build` then `npm start`; Express serves `frontend/dist` and the API on port 5000. MongoDB and Ollama run as local services.

The optional Docker Compose configuration provisions MongoDB 7 and Ollama with loopback port bindings and named data/model volumes. It does not start the application or download a model automatically. The Ollama image follows `latest`; resolve and pin a tested image digest for a controlled release. GPU configuration is deliberately left to platform validation.

Copy `.env.example` before editing deployment values. Do not commit secrets. Keep dependencies and model weights installed locally for offline operation. Back up the workspace directory and MongoDB together. No cloud service is required after provisioning.

This is a single-process application. Do not run multiple API workers against the same workspace: the inference/import locks are process-local. A future multi-user release needs durable queues, per-user authorization, quotas, authentication and atomic storage lifecycle management.
