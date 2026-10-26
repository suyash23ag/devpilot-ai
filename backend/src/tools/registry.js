import path from "node:path";
import { z } from "zod";
import { readSource } from "../services/workspace.js";
import { AppError } from "../utils/errors.js";
import { inspectFunctions } from "./quality.js";
import {
  architectureEvidenceSchema,
  buildArchitecture,
  buildDocument,
} from "./evidence.js";

export const findingSchema = z.object({
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  confidence: z.enum(["high", "medium", "low"]),
  file: z.string(),
  line: z.number().int().positive().optional(),
  description: z.string(),
  recommendation: z.string(),
});
const empty = z.object({}).strict();
const sourcePath = z.string().min(1).max(240);
export const redact = (text) =>
  text.replace(
    /((?:api[_-]?key|secret|password|token)\s*[:=]\s*["'`])[^"'`\n]+/gi,
    "$1[REDACTED]",
  );
export function selectFiles(files, max) {
  const score = (file) =>
    /(?:package\.json|README\.md|(?:app|server|main|index)\.[jt]sx?)$/i.test(
      file.path,
    )
      ? 0
      : /\.(?:[jt]sx?|py|java|c|cpp)$/.test(file.path)
        ? 1
        : 2;
  return [...files]
    .sort((a, b) => score(a) - score(b) || a.path.localeCompare(b.path))
    .slice(0, max);
}
export function createRegistry(project, config) {
  let architectureFacts = null;
  let generatedDocument = "";
  const inspected = new Set(),
    findings = [],
    failures = [];
  const selected = selectFiles(project.files, config.MAX_ANALYSIS_FILES);
  async function read(file) {
    if (!project.files.some((item) => item.path === file))
      throw new AppError(
        "FILE_NOT_FOUND",
        "File is not indexed in this project.",
        404,
      );
    if (!inspected.has(file) && inspected.size >= config.MAX_ANALYSIS_FILES)
      throw new AppError("COVERAGE_LIMIT", "Analysis file budget exhausted.");
    const text = await readSource(
      project.workspacePath,
      file,
      config.MAX_FILE_SIZE,
    );
    inspected.add(file);
    return text;
  }
  async function scan(kind) {
    const results = [];
    const add = (
      file,
      line,
      title,
      severity,
      description,
      recommendation,
      confidence = "medium",
    ) => {
      if (results.length < 80)
        results.push({
          file,
          line,
          title,
          severity,
          description,
          recommendation,
          confidence,
        });
    };
    for (const file of selected) {
      let content;
      try {
        content = await read(file.path);
      } catch {
        failures.push(file.path);
        continue;
      }
      const lines = content.split("\n");
      if (kind === "quality" && /\.(?:[jt]sx?|py)$/.test(file.path)) {
        for (const hint of inspectFunctions(lines))
          add(
            file.path,
            hint.line,
            hint.title,
            "low",
            hint.description,
            hint.recommendation,
            hint.confidence,
          );
      }
      if (kind === "quality" && lines.length > 500)
        add(
          file.path,
          1,
          "Large source file",
          "low",
          `File contains ${lines.length} lines.`,
          "Consider splitting cohesive responsibilities into modules.",
          "high",
        );
      const seen = new Map();
      lines.forEach((line, i) => {
        if (kind === "security") {
          if (
            /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'`][^"'`]{8,}/i.test(
              line,
            ) &&
            !/example|placeholder|REDACTED|process\.env/i.test(line)
          )
            add(
              file.path,
              i + 1,
              "Potential hardcoded credential",
              "high",
              "A credential-like name is assigned a literal value. It may be test data; verify context.",
              "Move real credentials to local environment configuration and rotate exposed values.",
            );
          if (/\beval\s*\(|new\s+Function\s*\(/.test(line))
            add(
              file.path,
              i + 1,
              "Dynamic code evaluation",
              "high",
              "Dynamic execution can be unsafe when input is untrusted.",
              "Trace the input and replace dynamic evaluation with a constrained parser.",
            );
          if (/\b(?:exec|execSync|os\.system|subprocess\.call)\s*\(/.test(line))
            add(
              file.path,
              i + 1,
              "Command execution requires review",
              "medium",
              "Command execution was detected; exploitability depends on input handling.",
              "Avoid shell interpolation and validate any externally controlled arguments.",
            );
          if (/innerHTML\s*=|dangerouslySetInnerHTML/.test(line))
            add(
              file.path,
              i + 1,
              "Raw HTML insertion",
              "medium",
              "HTML insertion may bypass normal output escaping.",
              "Verify that content is trusted or sanitized with an appropriate HTML sanitizer.",
            );
          if (/rejectUnauthorized\s*:\s*false|verify\s*=\s*False/.test(line))
            add(
              file.path,
              i + 1,
              "TLS verification appears disabled",
              "high",
              "A pattern that disables certificate verification was found.",
              "Enable certificate verification and configure a trusted CA.",
            );
        } else {
          if (/TODO|FIXME/.test(line))
            add(
              file.path,
              i + 1,
              "Unresolved maintenance marker",
              "info",
              "A TODO or FIXME marker remains in source.",
              "Confirm whether this work affects the requested change.",
              "high",
            );
          if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(line))
            add(
              file.path,
              i + 1,
              "Empty error handler",
              "medium",
              "A compact empty catch block may hide failures.",
              "Handle the failure or explicitly document why it is safe to ignore.",
            );
          const normalized = line.trim();
          if (normalized.length > 100 && !normalized.startsWith("//")) {
            if (seen.has(normalized))
              add(
                file.path,
                i + 1,
                "Repeated long statement",
                "low",
                `An identical statement also appears at line ${seen.get(normalized)}.`,
                "Review whether shared logic would improve maintainability.",
                "low",
              );
            else seen.set(normalized, i + 1);
          }
        }
      });
    }
    for (const finding of results)
      if (
        !findings.some(
          (f) =>
            f.file === finding.file &&
            f.line === finding.line &&
            f.title === finding.title,
        )
      )
        findings.push(finding);
    return {
      findings: results,
      inspectedFiles: inspected.size,
      totalFiles: project.fileCount,
      truncated: results.length >= 80 || selected.length < project.fileCount,
      failedFiles: [...new Set(failures)],
    };
  }
  const specs = [
    [
      "list_project_files",
      "List indexed relative files, with optional directory prefix.",
      z.object({ prefix: z.string().max(200).optional() }).strict(),
      z.object({
        files: z.array(
          z.object({
            path: z.string(),
            size: z.number(),
            language: z.string(),
          }),
        ),
        total: z.number(),
      }),
      async ({ prefix = "" }) => ({
        files: project.files
          .filter((f) => f.path.startsWith(prefix))
          .slice(0, 100)
          .map((f) => ({ path: f.path, size: f.size, language: f.language })),
        total: project.fileCount,
      }),
    ],
    [
      "read_file",
      "Read a source window; use startLine for subsequent chunks.",
      z
        .object({
          path: sourcePath,
          startLine: z.number().int().positive().default(1),
          maxLines: z.number().int().min(1).max(120).default(80),
        })
        .strict(),
      z.object({
        path: z.string(),
        startLine: z.number(),
        endLine: z.number(),
        totalLines: z.number(),
        text: z.string(),
        truncated: z.boolean(),
      }),
      async ({ path: file, startLine, maxLines }) => {
        const lines = (await read(file)).split("\n");
        const raw = lines
          .slice(startLine - 1, startLine - 1 + maxLines)
          .join("\n");
        return {
          path: file,
          startLine,
          endLine: Math.min(lines.length, startLine + maxLines - 1),
          totalLines: lines.length,
          text: redact(raw.slice(0, 6000)),
          truncated:
            raw.length > 6000 || startLine + maxLines - 1 < lines.length,
        };
      },
    ],
    [
      "search_code",
      "Search a literal string across prioritized source files; no regex execution.",
      z.object({ query: z.string().min(2).max(120) }).strict(),
      z.object({
        matches: z.array(
          z.object({ file: z.string(), line: z.number(), text: z.string() }),
        ),
        truncated: z.boolean(),
      }),
      async ({ query }) => {
        const matches = [];
        for (const file of selected) {
          const lines = (await read(file.path)).split("\n");
          lines.forEach((line, i) => {
            if (
              matches.length < 40 &&
              line.toLowerCase().includes(query.toLowerCase())
            )
              matches.push({
                file: file.path,
                line: i + 1,
                text: redact(line.slice(0, 240)),
              });
          });
        }
        return {
          matches,
          truncated:
            matches.length >= 40 || selected.length < project.fileCount,
        };
      },
    ],
    [
      "detect_languages",
      "Count file extensions; this does not infer semantic behavior.",
      empty,
      z.object({ languages: z.record(z.string(), z.number()) }),
      async () => ({
        languages: project.files.reduce(
          (out, f) => ({ ...out, [f.language]: (out[f.language] || 0) + 1 }),
          {},
        ),
      }),
    ],
    [
      "analyze_package_dependencies",
      "Read package.json dependencies and scripts without installing or executing anything.",
      empty,
      z.object({
        manifests: z.array(
          z.object({
            file: z.string(),
            name: z.string().optional(),
            scripts: z.record(z.string(), z.string()),
            dependencies: z.record(z.string(), z.string()),
            devDependencies: z.record(z.string(), z.string()),
          }),
        ),
        note: z.string(),
      }),
      async () => {
        const manifests = [];
        for (const file of selected
          .filter((f) => path.posix.basename(f.path) === "package.json")
          .slice(0, 5)) {
          let data;
          try {
            data = JSON.parse(await read(file.path));
          } catch {
            throw new AppError(
              "INVALID_MANIFEST",
              "A selected package.json is invalid.",
            );
          }
          manifests.push({
            file: file.path,
            name: typeof data.name === "string" ? data.name : undefined,
            scripts: data.scripts || {},
            dependencies: data.dependencies || {},
            devDependencies: data.devDependencies || {},
          });
        }
        return {
          manifests,
          note: "Declared versions only; no vulnerability feed or installed-version verification.",
        };
      },
    ],
    [
      "analyze_project_structure",
      "Identify directories and likely entry points by filenames.",
      empty,
      z.object({
        directories: z.array(z.string()),
        entryPoints: z.array(z.string()),
        frameworks: z.array(z.string()),
        architecture: architectureEvidenceSchema,
      }),
      async () => {
        const sources = [];
        for (const file of selected.filter((f) =>
          /\.(?:[jt]sx?|mjs|cjs|py|java|cpp|c)$/.test(f.path),
        )) {
          try {
            sources.push({ file: file.path, text: await read(file.path) });
          } catch {
            failures.push(file.path);
          }
        }
        architectureFacts = buildArchitecture(project, sources);
        return {
          directories: [
            ...new Set(project.files.map((f) => path.posix.dirname(f.path))),
          ].slice(0, 60),
          entryPoints: project.files
            .filter((f) =>
              /(?:^|\/)(?:main|index|app|server)\.[a-z]+$/.test(f.path),
            )
            .map((f) => f.path)
            .slice(0, 30),
          frameworks: project.frameworks || [],
          architecture: architectureFacts,
        };
      },
    ],
    [
      "generate_documentation",
      "Build evidence-grounded README or developer documentation from validated manifests and static imports; unknown facts stay unknown.",
      z.object({ format: z.enum(["readme", "documentation"]) }).strict(),
      z.object({ markdown: z.string(), source: z.literal("static-evidence") }),
      async ({ format }) => {
        const depTool = registry.analyze_package_dependencies;
        const deps = depTool.output.parse(await depTool.execute({}));
        if (!architectureFacts) {
          const structureTool = registry.analyze_project_structure;
          structureTool.output.parse(await structureTool.execute({}));
        }
        generatedDocument = buildDocument(
          project,
          deps.manifests,
          architectureFacts,
          format,
        );
        return { markdown: generatedDocument, source: "static-evidence" };
      },
    ],
    [
      "generate_project_summary",
      "Return deterministic metadata and coverage limits.",
      empty,
      z.object({
        name: z.string(),
        fileCount: z.number(),
        languages: z.array(z.string()),
        fileBudget: z.number(),
      }),
      async () => ({
        name: project.name,
        fileCount: project.fileCount,
        languages: project.languages,
        fileBudget: config.MAX_ANALYSIS_FILES,
      }),
    ],
    [
      "find_potential_security_issues",
      "Find potential risky patterns, with file/line evidence and confidence.",
      empty,
      z.object({
        findings: z.array(findingSchema),
        inspectedFiles: z.number(),
        totalFiles: z.number(),
        truncated: z.boolean(),
        failedFiles: z.array(z.string()),
      }),
      () => scan("security"),
    ],
    [
      "find_code_quality_issues",
      "Find long or branch-heavy functions, unclear names, large files, repeated statements and error-handling cues.",
      empty,
      z.object({
        findings: z.array(findingSchema),
        inspectedFiles: z.number(),
        totalFiles: z.number(),
        truncated: z.boolean(),
        failedFiles: z.array(z.string()),
      }),
      () => scan("quality"),
    ],
  ];
  const registry = Object.fromEntries(
    specs.map(([name, description, input, output, execute]) => [
      name,
      { name, description, input, output, execute },
    ]),
  );
  return {
    descriptions: specs.map(([name, description, input]) => ({
      name,
      description,
      input: z.toJSONSchema(input),
    })),
    async invoke(name, args) {
      const tool = registry[name];
      if (!tool)
        throw new AppError("UNKNOWN_TOOL", "Requested tool is not available.");
      return tool.output.parse(await tool.execute(tool.input.parse(args)));
    },
    get findings() {
      return findings;
    },
    get architecture() {
      return architectureFacts;
    },
    get document() {
      return generatedDocument;
    },
    coverage() {
      return {
        inspectedFiles: [...inspected],
        totalFiles: project.fileCount,
        fileBudget: config.MAX_ANALYSIS_FILES,
        failedFiles: [...new Set(failures)],
      };
    },
  };
}
