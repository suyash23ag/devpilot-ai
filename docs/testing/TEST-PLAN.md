# Test plan

## Automated

`npm test` runs Node backend tests and Vitest UI tests. Backend tests cover valid ZIP extraction, traversal, Windows device paths, symlinks, duplicate entries, binary content, file/entry/expansion limits, cleanup, tool validation, evidence locations, plan/evaluate/continue flow, tool failures, cancellation, step budget, incomplete review, degraded API status, origin/host checks, malformed JSON and mocked Ollama status. UI tests cover empty dashboard, upload navigation/validation/errors, finding filtering/coverage and retry.

`npm run check` adds TypeScript and a production frontend build. Tests use isolated temporary directories and mocked models; they do not prove live Llama performance or MongoDB persistence.

## Live acceptance

With real MongoDB and Ollama, run `npm run smoke`, import a source fixture, inspect files, run every action, cancel a run, restart the server, revisit history and delete a project. Confirm unavailable-service and invalid-model errors. Record live results separately from mocked tests.

## Offline and hardware

`npm run test:offline` provides a repeatable process-scoped network-denial check with real local services, all six model actions and restart persistence. This does not disable the OS network or constrain the separate daemons. A physically disconnected device remains an additional hardware acceptance check. `npm run benchmark` records indexing/tool timing, bounded coverage, sampled RSS and CPU for larger synthetic imports. Jetson/GPU validation is deferred at the user's request.

All reports must distinguish passed, failed and not run. Missing MongoDB/Ollama cannot be counted as a successful full-system test. See VERIFICATION.md for the latest actual evidence.
