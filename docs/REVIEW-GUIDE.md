# DevPilot AI review guide

## Run the application

Install Node.js 22.12 or newer, local MongoDB and Ollama. Run `npm ci`, copy `backend/.env.example` to `backend/.env`, install the model with `ollama pull llama3.2:1b`, then run `npm run build` and `npm start`. Open http://127.0.0.1:5000. The environment file, source workspaces, local database data and model weights are intentionally not included in the source delivery.

For development, `npm run dev` opens the Vite/API workflow at http://127.0.0.1:5173. Windows setup is also available through `scripts/setup.ps1`; Linux/macOS setup through `scripts/setup.sh`. Keep loopback bindings.

## Demonstrate the workflow

1. Open System status and confirm API, database, Ollama and the exact configured model are available.
2. Import `tests/fixtures/task-api.zip`, the generated demonstration fixture. The project contains a deliberately risky legacy expression for review testing; the application never executes it.
3. Inspect `server.js` in the explorer and verify the displayed source and line numbers.
4. Run Code review. The lexical review should flag dynamic evaluation in `legacy.js` at line 2 and show severity, confidence and a recommendation.
5. Observe planning, tool, evaluation and reporting events. No private reasoning is displayed.
6. Generate README/documentation. Confirm commands come from the manifest and unknown setup details remain unknown. Download the Markdown artifact.
7. Explain architecture. Confirm `server.js` imports `express`, inspect source references, and review graph limitations. The graph does not invent a database or frontend.
8. Revisit Analysis history after restart. Start and cancel a new run, then verify the project can be deleted after cancellation finishes.

## Reproduce verification

- `npm run check`: type checks, deterministic tests and build.
- `npm run smoke`: live local dependency/model readiness.
- `npm run test:live`: all six actions on a generated disposable project.
- `npm run test:offline`: guarded application startup, all six accuracy-checked actions, persistence after restart and lifecycle checks using a separate test database/workspace.
- `npm run benchmark`: larger synthetic projects and archive/coverage boundaries.

Read `testing/VERIFICATION.md` and the JSON evidence alongside the source. Source analysis is bounded and the model summary is a draft interpretation. Jetson validation remains deferred by the user's instruction; do not represent it as completed.

## Delivery contents

The repository and source archive include frontend/backend source, the lockfile, environment examples, model configuration, setup/deployment helpers, demo fixture, an optional CI template and technical documentation. Install npm dependencies and model weights separately. No uploaded user projects, credentials, local database files or dependency folders are included.
