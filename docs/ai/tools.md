# Developer tool registry

Every registry entry has a name, description, Zod input/output schemas and execute function. Both boundaries are validated. `createRegistry` receives a trusted project root from metadata; model arguments never select the root.

- `list_project_files({prefix?})`: up to 100 relative paths, sizes, languages and total count.
- `read_file({path,startLine?,maxLines?})`: up to 120 lines/6000 characters, total line count and truncation indicator.
- `search_code({query})`: case-insensitive literal search, up to 40 matches from prioritized files. No arbitrary regex.
- `detect_languages({})`: extension counts.
- `analyze_package_dependencies({})`: up to five selected package manifests with scripts and declared dependencies. No install or network audit.
- `analyze_project_structure({})`: directory and entry-point hints plus parsed JavaScript/TypeScript imports, literal route calls and disclosed graph limitations. Referenced modules are not executed.
- `generate_documentation({format})`: `readme` or `documentation`; assembles declared dependencies/scripts and source evidence into a document. Unknown configuration and deployment facts remain explicitly unknown.
- `generate_project_summary({})`: deterministic project metadata and file budget.
- `find_potential_security_issues({})`: credential-like literals, dynamic evaluation, command execution, HTML insertion and disabled TLS verification patterns.
- `find_code_quality_issues({})`: large files, repeated long statements, TODO/FIXME markers and empty compact catch blocks. Bounded lexical checks also flag short/non-descriptive function names and long or branch-heavy JavaScript/Python functions at low confidence; these are not parser-derived complexity measurements.

Findings include severity, conservative confidence, relative file, line, explanation and recommendation. These are lexical heuristics, not semantic proofs. Source snippets redact common credential-like literal assignments; secret-file exclusion and this heuristic are not a comprehensive secret detector.

Tools cannot execute uploaded code, write source or access arbitrary system paths. Budget failures and unsupported calls are explicit. Supported formats and exclusions are defined in `services/workspace.js`.
