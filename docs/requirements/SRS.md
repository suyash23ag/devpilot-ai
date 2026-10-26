# Software requirements specification

DevPilot AI is a single-user local developer assistant. The operator imports a source project, selects a task, observes safe execution events and reviews evidence-backed output. The initial runtime is Node.js 22.12 or newer, React/Vite, Express, MongoDB/Mongoose and local Ollama with llama3.2:1b through LangChain JS.

The model plans and evaluates. Validated tools perform deterministic reads inside an application-owned workspace. No arbitrary commands, project execution, external AI calls, automatic source edits or hosted authentication are in scope.

Inputs are untrusted ZIP archives and task text. Outputs are project metadata, bounded file content, analysis findings, architecture descriptions and downloadable Markdown. Source remains on disk; MongoDB stores metadata and results. Startup must not claim readiness when dependencies are unavailable.

Acceptance requires all gates in ../ROADMAP.md and the testing plan, including real-model and offline tests. This specification describes the target MVP; completion is tracked separately.
