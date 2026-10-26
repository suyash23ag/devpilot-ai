# Acceptance cases

1. Valid ZIP indexes supported source and excludes secrets/dependency folders.
2. Traversal/absolute/device paths cannot write outside a project.
3. Symlink, duplicate, executable and binary-text archives fail and clean up.
4. File size, expansion size and entry-count limits reject oversized inputs.
5. Missing database returns degraded health and 503 on project operations.
6. Missing Ollama/model reports unavailable; no fake analysis is shown.
7. Model plans multiple tools, evaluates results, requests another step and finishes.
8. Invalid tool calls fail; partial tool failures remain visible in metadata.
9. Invalid model output has bounded retries and fails explicitly.
10. File/context/step limits disclose incomplete coverage or fail.
11. Dashboard, ZIP selection, upload errors, navigation and finding filters behave correctly.
12. Documentation uses observed scripts and marks unknown facts.
13. Cancellation prevents additional tool dispatch; restart marks interrupted runs failed.
14. Project creation, persistence, history and deletion work with real MongoDB.
15. Offline restart and real inference succeed after provisioning.
16. Jetson resource/GPU behavior is measured on actual hardware.

Tests 12–16 require live/manual acceptance in addition to unit tests. See VERIFICATION.md for status; this list itself is not proof of completion.
