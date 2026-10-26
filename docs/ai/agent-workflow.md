# Agent workflow

1. Validate task/project and check local model readiness.
2. Reserve the single inference slot and persist a queued AgentRun.
3. Mark running; ask for one to three schema-constrained tool calls. Each tool has its own argument schema.
4. Validate every call through the tool registry. Execute only project-scoped reads.
5. Persist safe stage/tool messages and collect bounded observations. Tool failures become explicit errors.
6. Run missing action-specific evidence tools as explicit coverage events. Explanation/documentation tasks also read a bounded README and likely source entry point when present, so README existence does not replace source inspection. Ask the model whether to continue or finish, with at most two evaluation rounds.
7. Prevent duplicate calls; enforce ten tool calls by default, file/context limits, per-model timeout and cancellation. Finalize partial optional work with disclosed budget limits.
8. Reject evidence-free results and missing required evidence. Attach documents from the validated documentation tool and architecture from parsed source. The separate final model call generates only a draft interpretation, not commands or graph edges.
9. Persist an Analysis and final AgentRun, or a sanitized failure/cancellation.

The UI polls persisted events. Stages are planning, tool, result/tool-error, coverage, evaluating, reporting and completed. Private reasoning and raw model planning prose are never shown. A completed event refers to agent computation; terminal run status also depends on result persistence.
