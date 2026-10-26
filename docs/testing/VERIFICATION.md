# Desktop verification report

Verified on 26 October 2026. This is a trusted single-user desktop MVP. Jetson testing is deferred at the user's request.

## Passed locally

- `npm run check`: TypeScript, 30 backend tests, 5 UI tests and the production frontend build pass.
- `npm run smoke`: API, MongoDB, Ollama and a real `llama3.2:1b` JSON response pass.
- All six real-model actions complete: analysis, code review, README, architecture, documentation and improvements.
- Document assertions confirm the expected sections, observed `npm start`/`npm test` commands, and explicit unknown configuration. The generated demo document does not invent Jest, a build script or a single-page application.
- Architecture assertions confirm the parsed `server.js` to `express` import and literal GET route. No README/package-manifest runtime connections are invented.
- Source reads, input validation, project isolation, active-run exclusion, cancellation, deletion, and project/run/history persistence across API restart pass.
- The final dependency audit reports zero known advisories after updating request/upload dependencies and Vitest. See `evidence/dependency-audit.json`.

## Offline validation scope

`npm run test:offline` launches a separate API on port 5001 with test-only non-loopback TCP, DNS and fetch requests blocked. All six real-model actions and application restart/persistence pass against existing local MongoDB and Ollama. The test sets hosted tracing environment flags to true before startup; application configuration disables them. No denied remote-network attempt occurred in the application run. Separate negative tests prove that remote DNS, TCP and fetch attempts are rejected.

This does not disable the workstation's internet or firewall. It does not constrain the separate MongoDB/Ollama processes, certify OS traffic, or replace a physical disconnected-network test on Jetson. Dependencies and model files must already be installed. Raw results: `evidence/offline-acceptance.json`.

## Observed model timings

For the generated four-file Task API fixture, recorded agent durations were approximately 37.9 seconds for analysis, 28.1 seconds for review, 49.0 seconds for README, 64.2 seconds for architecture, 33.1 seconds for documentation and 28.5 seconds for improvements. These are one-run observations, not latency guarantees or large-project model benchmarks. Coverage/context clipping is reported per run.

## Larger project checks

`npm run benchmark` generated 100, 500 and 1000-file synthetic projects on Windows x64 with an Intel Core i5-1335U and approximately 16 GB RAM.

- 100 files: 301 ms indexing; 30 files inspected; about 116 MiB sampled benchmark-process RSS.
- 500 files: 2516 ms indexing; 30 files inspected; about 139 MiB sampled benchmark-process RSS.
- 1000 files: 6144 ms indexing; 30 files inspected; about 158 MiB sampled benchmark-process RSS.
- The seeded risky expression was located with the expected source line. The default 30-file inspection budget remained enforced.
- A 1001-entry archive was rejected and partial extracted data was removed.

These measurements cover ZIP extraction and deterministic tools in the benchmark process. They exclude LLM memory, full-system memory, hardware GPU metrics and model inference on a large project. The 30-file sample is deliberately incomplete. Raw data: `evidence/performance.json`.

## Deliberate limits and deferred work

- Jetson installation, acceleration and resource measurements: deferred by the user.
- A physical air-gapped device restart: not performed; process-scoped offline acceptance passed as described above.
- Model summaries remain draft interpretations. Pattern findings are not proofs of exploitable vulnerabilities. Static module/route observations do not establish runtime data flow.
- JavaScript/TypeScript import graphs are parsed; aliases, other-language import graphs, dynamic behavior and parse errors are explicitly limited.
- This is one API process for one trusted local user, not a public or multi-user service.

An optional Node 22 GitHub Actions template is provided in `../ci/desktop-checks.yml`. The available delivery credential has repository write access without the separate workflow scope, so remote CI was not enabled or represented as passed. Live model, MongoDB and hardware tests remain explicit local checks.
