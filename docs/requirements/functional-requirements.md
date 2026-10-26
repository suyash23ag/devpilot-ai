# Functional requirements

- FR01: accept a named ZIP project with bounded upload size and isolated extraction.
- FR02: persist project name, original filename, languages, frameworks, file count, status and timestamps.
- FR03: list projects, inspect a tree and read allowed text files; delete an inactive project.
- FR04: report API, database, Ollama and exact configured-model availability independently.
- FR05: accept analysis, code-review, README, documentation, architecture and improvement tasks.
- FR06: have the local LLM select validated tool calls, evaluate observations and produce a structured answer.
- FR07: persist safe event messages, used tools, completion status and results, without private reasoning.
- FR08: display severity, confidence, file and line evidence for heuristic findings.
- FR09: export generated Markdown and distinguish incomplete coverage from comprehensive review.
- FR10: cancel a run and expose actionable failure states.
