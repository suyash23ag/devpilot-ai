# Data flow

1. Browser posts multipart name and ZIP.
2. API validates limits and extracts allowed text into a new isolated directory.
3. Indexer computes relative paths, sizes, languages and framework hints.
4. MongoDB stores metadata; source stays on disk.
5. Browser submits task and receives a run identifier.
6. Worker loads project metadata and asks local Ollama for a bounded plan.
7. Registry validates tool inputs and produces bounded observations.
8. Local model evaluates observations and requests another allowed step or returns output.
9. Worker persists events and results; browser polls the run.
10. Browser renders findings and exports Markdown locally.

No project source is sent to an external AI provider. The configured Ollama address must represent a trusted local runtime.
