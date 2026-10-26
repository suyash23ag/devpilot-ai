# Database schema

Mongoose models live in `backend/src/models/index.js`; buffering is disabled. Database connection retries run while health remains available.

## Project

`name`, `originalFileName`, private `workspacePath`, `files` containing relative path/size/language, `languages`, `frameworks`, `fileCount`, `skippedCount`, `status`, `indexMs`, `createdAt`, `updatedAt`. Workspace path is excluded from default queries and public serialization. Files remain on disk. Conditional status updates coordinate `ready`, `analyzing` and `deleting`; startup recovers interrupted `analyzing` projects to `ready`.

## Analysis

`projectId` (indexed reference), `runId`, `type`, `status`, `summary`, `findings`, `markdown`, `architecture`, `metadata`, timestamps. Findings contain title, severity, confidence, relative file, positive line, description and recommendation. Metadata records coverage, truncation, tool errors, duration, model time, RSS and process CPU deltas.

## AgentRun

`projectId` (indexed reference), `userRequest`, `type`, `status`, `toolsUsed`, `executionSteps`, `result`, `error`, timestamps. States: queued → running → completed/failed/cancelled. Startup marks interrupted queued/running records failed. There is no durable job resumption.

Only bounded events/results are persisted; source files and full prompts are not copied into MongoDB. Deletion removes files then related records. This is not a cross-filesystem/database transaction: if deletion is interrupted, the project remains marked deleting and deletion can be retried. Back up workspace and metadata together.
