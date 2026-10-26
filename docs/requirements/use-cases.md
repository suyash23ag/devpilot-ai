# Use cases

1. **Import:** operator supplies a name and ZIP; system validates, extracts and indexes; failure removes partial data.
2. **Inspect:** operator opens a project and file; system returns a bounded text representation from that project only.
3. **Review:** operator requests review; model plans tools; tools gather evidence; model evaluates; UI displays findings and coverage.
4. **Document:** operator requests README or documentation; system supplies bounded evidence; generated Markdown marks unknown commands/features rather than inventing them.
5. **Explain:** operator requests architecture; system returns components, connections, technologies and data flow supported by inspected files.
6. **Recover:** dependency is down or model output is invalid; system shows failure and preserves diagnostic status without raw secrets.
7. **Remove:** operator deletes a project with no active run; local project directory and related records are removed.
