# Agent architecture

Task → validated JSON plan → registry dispatch → required evidence checks → bounded observations → short JSON continuation decision → further tools or a separate final report.

The orchestrator owns step count, duplicate-call prevention, coverage requirements, context budget, cancellation, event persistence and status transitions. The model owns planning and up to two continuation decisions, but cannot bypass registry schemas. Required evidence checks may add calls explicitly attributed to the system. Tool failures become safe observations; missing required evidence fails the run. Optional exhausted budgets are disclosed.

Execution events contain stage, tool name, timestamp and a short factual message. They never contain chain-of-thought, raw model planning prose or secret-bearing source snippets.

The final response combines deterministic findings with model summary, optional Markdown and an architecture object. Heuristics use conservative confidence levels. The model must not convert a suspicious pattern into a proven exploit without supporting evidence.
