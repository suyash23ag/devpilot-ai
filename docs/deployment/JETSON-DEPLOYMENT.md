# NVIDIA Jetson Orin Nano deployment

This is a deployment checklist, not a hardware-validation claim. Verify exact board RAM, JetPack/L4T, architecture, disk space, MongoDB CPU requirements and Ollama GPU compatibility on the target.

Status on 26 October 2026: target-device testing is deferred at the user's request. Desktop acceptance and benchmarks are recorded in ../testing/VERIFICATION.md and must not be described as Jetson results.

## Prepare software

Use a supported JetPack Ubuntu image. Install a compatible Node.js 22+ ARM64 runtime and confirm `node --version` and `uname -m`. MongoDB must come from a distribution/image that explicitly supports that CPU and OS; an ARM64 label alone does not prove Jetson compatibility. A trusted local database host is an alternative but changes the single-device topology and must remain available offline.

Install Ollama using its official platform instructions and verify support for the exact JetPack stack. Establish a CPU baseline first. The included Compose file is a generic CPU setup, not a verified Jetson GPU configuration. It intentionally makes no GPU compatibility claim.

## Provision while online

1. Install MongoDB, Node.js and Ollama.
2. Run `ollama pull llama3.2:1b`.
3. Run `bash scripts/setup.sh` to install packages, create the environment file if absent, and build the UI.
4. Edit `backend/.env` for the local database and model. Keep loopback binding.
5. Start MongoDB and Ollama; run `npm start`.
6. In another terminal run `npm run smoke`.
7. Open http://127.0.0.1:5000 locally and run a real review against a small ZIP.

`bash scripts/deploy-jetson.sh` checks ARM64 and calls setup; it does not silently install OS packages, change GPU drivers or configure a public service.

## Resource and offline verification

Start with one inference, 4096 context tokens, 30 files and 12000 context characters. Reduce context/files if memory pressure appears. Measure indexing duration, model latency, total time, RSS and CPU. Measure GPU usage with target-supported tools such as tegrastats only after confirming GPU inference. No latency or acceleration is promised.

Disconnect the internet after provisioning, restart all services, and repeat upload, browsing, review and documentation. Keep dependencies, built assets and model files on persistent local storage. Validate the exact model tag. Do not count a mocked model test as offline hardware verification.

## Troubleshooting

- Daemon unavailable: check the local Ollama service and loopback port.
- Model not ready: pull the exact configured tag during provisioning.
- MongoDB fails: verify CPU/JetPack support, local service and URI.
- Invalid JSON: retry a narrower task; small-model quality is a real constraint.
- Out of memory: reduce budgets and close competing inference workloads.
- Container illegal instruction: investigate CPU/image compatibility rather than assuming ARM64 support is sufficient.
- Remote browser access: unsupported by this unauthenticated MVP; add authentication/TLS/isolation before widening network exposure.
