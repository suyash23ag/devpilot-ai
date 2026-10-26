# System architecture

The browser talks only to the local Express API. Vite proxies /api in development; Express serves the production build. MongoDB stores metadata, run events and results. An application-owned workspace stores imported text source. The LangChain adapter talks to the configured local Ollama daemon.

## Trust boundaries

Archive names, archive bytes, task text, source code and model output are untrusted. Validate before crossing each boundary. Tools receive a project-scoped context, never a model-supplied root directory. Resolve real paths and reject links; allow only supported text file types. Avoid returning workspace absolute paths. Do not log prompts or source content.

This is a loopback-only, trusted single-user MVP. CORS/origin checks are not authentication. Remote or multi-user deployment requires authentication, authorization, CSRF review, TLS, quotas and separate user workspaces before exposure.

## Failure behavior

Database loss prevents persistence-dependent operations. Ollama failure prevents AI tasks but should not prevent source browsing when MongoDB is healthy. Model JSON errors and exhausted execution limits are failures, not fabricated reports. Partial uploads must be cleaned up. In-flight runs cannot be assumed successful after restart.
