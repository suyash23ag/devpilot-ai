# Non-functional requirements

## Security

Bind to loopback by default; reject unexpected web origins. Enforce archive, file, entry-count, expanded-byte and context limits. Reject traversal, absolute paths, links and device paths. Never execute imports, install uploaded dependencies or expose a command tool. Sanitize server errors and avoid secret logging.

## Resource use

Default target budgets: 10 MiB upload, 50 MiB expansion, 1 MB per text file, 1000 project entries, 30 analysis files, 12000 context characters, 4096 model context tokens and ten tool steps. These are configuration targets, not measured capacity claims. One active inference at a time limits memory pressure.

## Reliability and privacy

No silent fallback to invented results. Bound model calls by timeout and validate JSON. Store source only in the local workspace. Download packages/models during setup; normal operation must not require internet. No analytics, remote fonts or hosted AI.

## Maintainability

Separate transport, persistence, workspace service, tool registry and model orchestration. Tests must exercise safety boundaries and failure paths. Document actual limitations rather than assuming Jetson compatibility.
