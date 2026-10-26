# Implementation roadmap

This roadmap separates implemented desktop behavior from verification that requires target hardware. Actual evidence is recorded in testing/VERIFICATION.md.

1. **Foundation:** workspace packages, React/Vite UI, Express API, validated configuration, MongoDB connection and dependency health. Gate: frontend builds; API starts and reports missing dependencies honestly.
2. **Project management:** bounded ZIP extraction, isolated project directories, metadata and file explorer. Gate: traversal, symlink, expansion-limit, invalid-file and cleanup tests.
3. **Local inference:** LangChain Ollama adapter, configurable model, timeouts, readiness and JSON validation. Gate: adapter contract tests plus a real installed-model response.
4. **Agent:** bounded planning, allowlisted tool dispatch, observation evaluation, persisted events and final result. Gate: multi-step, invalid output, failure and cancellation tests.
5. **Developer tools:** source discovery, bounded reads, literal search, language/dependency/structure inspection and heuristic review. Gate: fixture-based evidence and coverage checks.
6. **AI features:** code review, README, architecture, documentation and improvements. Gate: complete real-model runs; generated claims cite available evidence.
7. **Interface:** upload, project explorer, execution console and result views. Gate: loading/error/empty states and user-flow tests.
8. **Integration:** full suite, build, service smoke and offline validation. Gate: record actual results and unmet dependencies.
9. **Jetson:** CPU baseline first, target-specific Ollama acceleration and resource measurements. Gate: verify on physical hardware; do not infer compatibility from desktop tests.

## Current implementation

Phases 1–7 are implemented. Desktop validation includes 35 passing automated tests, a production build, all six real-model actions, grounded document/graph assertions, restart persistence, cancellation and deletion. Phase 8 adds process-scoped offline acceptance and 100/500/1000-file benchmarks with raw JSON evidence. A physical disconnected-network/device test is not claimed. Phase 9 supplies deployment helpers and guidance; actual Jetson testing is deferred at the user's request.

## Release boundaries

Do not call the application production-ready until MongoDB persistence, live model planning/evaluation, project deletion, browser flows, offline restart and target deployment have been exercised. Automated mocked tests establish contracts, not model quality or hardware readiness.
