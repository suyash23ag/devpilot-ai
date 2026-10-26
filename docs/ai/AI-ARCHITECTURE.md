# AI architecture

`ChatOllama` from `@langchain/ollama` is the only model adapter. Default: `llama3.2:1b`, temperature 0.1, schema-constrained JSON, 4096 context tokens and 1800 maximum predicted tokens for the final report (500 for planning, 250 for evaluation). Configuration restricts Ollama to local HTTP loopback and disables inherited LangSmith/LangChain hosted tracing. No hosted model, embeddings or external vulnerability feed is used.

`makeModel` validates JSON with Zod, retries invalid structured output once, and enforces per-call timeout/cancellation. A small model may still fail planning or produce inaccurate explanations. Errors are visible; there is no fabricated-success fallback. Mocked model tests validate control flow, not real Llama capability.

Tools prioritize manifests, README and likely entry points, then source files. Reads support line windows. Each observation is bounded; evaluation retains a clipped share of each observation within a conservative context allowance. Coverage/truncation are disclosed. Character budgets are not exact tokenizer counts; lower budgets on constrained devices. Planning, continuation decisions and final reporting are separate model calls.

Findings originate from deterministic review tools. The model supplies a draft interpretation, while documentation is assembled from validated manifest/source evidence and graph edges are parsed with the TypeScript compiler API. Comments and example strings cannot create import or route evidence. Aliases, unsupported language graphs, graph limits and parse failures are disclosed. Dependency analysis reports declarations, not verified CVEs. Narrative model accuracy still requires developer review.
