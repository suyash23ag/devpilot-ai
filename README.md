# DevPilot AI

A local, offline-first developer assistant using React/Vite, Express, MongoDB, LangChain JS and Ollama. Import a ZIP, inspect source files, run bounded multi-step analysis and export generated documentation. No hosted AI API, telemetry, or remote font is used.

## Local setup

Prerequisites: Node.js 22.12 or newer, MongoDB, and Ollama. Internet is needed once to install packages and download the model.

1. Run `npm install` from this directory.
2. Copy `backend/.env.example` to `backend/.env`.
3. Start MongoDB locally, or run `docker compose up -d mongo ollama` for the CPU container setup.
4. Run `ollama pull llama3.2:1b` for native Ollama, or `docker compose exec ollama ollama pull llama3.2:1b` for the container.
5. Run `npm run dev`. Open http://127.0.0.1:5173.

The API listens on http://127.0.0.1:5000. The dashboard shows real dependency readiness. Upload and analysis require MongoDB; AI runs also require the configured model. There is no simulated success mode.

## Production on one machine

Run `npm run build`, then `npm start`. Express serves the built UI and API on port 5000. Keep the default loopback binding: this MVP is a trusted single-user local application, with no multi-user authentication. Do not expose it directly to a LAN or the public internet. A run queue permits one inference at a time. Stale in-flight runs are marked failed on restart.

## Commands

- `npm test`: backend safety/agent/API tests and UI tests.
- `npm run check`: TypeScript, tests and production frontend build.
- `npm run smoke`: live MongoDB/Ollama/model check against a running API; exits nonzero if dependencies are not ready.
- `node scripts/integration.mjs`: opt-in live test of ZIP import, persistence and all six model actions; removes its generated project afterward. Use `--keep` to retain the clearly labeled demo fixture.
- `npm run dev`: starts both servers.
- `npm run test:offline`: starts a separate guarded API on port 5001, blocks non-loopback network access in that process, exercises all six real-model actions, checks accuracy and restart persistence, then cleans up its generated project. Requires local MongoDB/Ollama; does not disable the computer's network.
- `npm run benchmark`: generates 100/500/1000-file fixtures and records indexing, deterministic-tool timing, bounded coverage and process memory. No model calls.

Windows users can run `powershell -File scripts/setup.ps1`; Linux/macOS users can run `bash scripts/setup.sh`. Both create the environment file only if absent and build the UI.

## Workflow

Upload a source ZIP (10 MiB compressed, 50 MiB expanded by default). Imported binaries, links, secrets files, dependency folders and traversal paths are rejected or excluded. Projects are never executed. Open a project to browse indexed text files, choose an analysis action or enter a task, and follow safe tool events in the agent console. Results include deterministic pattern findings plus a model summary, architecture and optional Markdown artifact. Pattern matches are review candidates, not proof of exploitable vulnerabilities.

The LLM chooses an allowlisted JSON plan, evaluates tool observations and can request additional bounded tool calls. The orchestrator supplements missing required evidence, prevents duplicate calls and limits evaluation rounds before requesting a separate final report. Invalid model output, unavailable dependencies and missing required evidence fail explicitly; partial tool errors and exhausted optional budgets are disclosed. The model never receives filesystem capabilities or a shell.

## Limits

Analysis is bounded by file count, file size and context budget. Reports disclose coverage; they are not exhaustive audits. No package vulnerability database is downloaded. There is no semantic compiler, sandboxed test runner or automatic source modification. Cancellation stops queued work and requests abort of active model calls. Jetson acceleration and offline behavior must be verified on the target device; see [deployment guide](docs/deployment/JETSON-DEPLOYMENT.md).

See [roadmap](docs/ROADMAP.md), [API](docs/api/API-SPEC.md), [security architecture](docs/architecture/system-architecture.md), and [test plan](docs/testing/TEST-PLAN.md).

For handoff, start with the [review guide](docs/REVIEW-GUIDE.md) and [verified desktop results](docs/testing/VERIFICATION.md). Jetson validation is deferred by the user. Documents use validated manifest/source facts, architecture uses parsed imports, and model prose is visibly a draft interpretation.
