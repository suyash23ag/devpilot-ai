# API specification

Base: `/api`. Success: `{success:true,data:...,error:null}`. Failure: `{success:false,data:null,error:{code,message}}`. Stack traces and workspace absolute paths are not returned. This is a loopback-only single-user API; it has no remote-user authentication.

## Status

- `GET /health`: API status (`ready` or `degraded`), database boolean, configured model, active run identifier, uptime and RSS. HTTP 200 means the health handler responded; inspect database/status for readiness.
- `GET /ollama/status`: daemon `connected`, exact configured `model`, `modelReady` and installed model names. A reachable daemon with a missing tag is not ready.

## Projects

- `POST /projects/upload`: multipart `name` (1–100 characters) and `file` (ZIP). Returns 201 with metadata and indexed files. Default 10 MiB compressed limit; one import at a time.
- `GET /projects`: newest 100 projects; file lists omitted.
- `GET /projects/:id`: project metadata and relative indexed files.
- `GET /projects/:id/file?path=src/index.js`: bounded text content; file must be indexed and allowed.
- `DELETE /projects/:id`: removes project files and related records; active analysis returns 409.

## Agent and analysis

- `POST /projects/:id/analyze`, `/code-review`, `/readme`, `/documentation`, `/architecture`, `/improvements`: start the named task, returning 202 with an AgentRun.
- `POST /agent/run`: JSON `{projectId,userRequest}`; task text 5–2000 characters. Returns 202.
- `GET /agent/runs/:id`: status, safe executionSteps, toolsUsed, result and sanitized error. Poll every two seconds.
- `POST /agent/runs/:id/cancel`: requests cancellation or returns terminal status.
- `GET /analyses`: newest 30 completed analyses with summary and runId; open the run for full findings and artifacts.

Only one local run is accepted at once; new runs receive `AGENT_BUSY`/409 while occupied. Missing database or model returns 503. Invalid fields/IDs return 400, missing records 404, unsafe archives 400, upload limits 413. Completed review candidates have file/line/severity/confidence; generated architecture is model output and must be reviewed.

Project and analysis routes require MongoDB. No project/source mutation endpoint or command-execution endpoint exists.
