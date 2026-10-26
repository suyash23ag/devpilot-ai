import path from "node:path";
import { z } from "zod";
import ts from "typescript";
export const architectureEvidenceSchema = z.object({
  components: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      files: z.array(z.string()),
    }),
  ),
  connections: z.array(
    z.object({ from: z.string(), to: z.string(), description: z.string() }),
  ),
  dataFlow: z.array(z.string()),
  technologies: z.array(z.string()),
  limitations: z.array(z.string()).default([]),
});
export function buildArchitecture(project, sources) {
  const components = new Map(),
    connections = [],
    dataFlow = [],
    packages = new Set(),
    limitations = new Set();
  const paths = new Set(project.files.map((f) => f.path));
  for (const { file, text } of sources) {
    components.set(file, {
      name: file,
      description:
        "Source module inspected statically; runtime behavior is not executed.",
      files: [file],
    });
    if (!/\.(?:[jt]sx?|mjs|cjs)$/.test(file)) {
      limitations.add(
        "Import and route parsing is supported for JavaScript and TypeScript. Other source languages are indexed but their graph is incomplete.",
      );
      continue;
    }
    const parsed = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      /x$/.test(file)
        ? ts.ScriptKind.TSX
        : /\.(?:ts)$/.test(file)
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JS,
    );
    if (parsed.parseDiagnostics.length) {
      limitations.add(`Syntax errors prevented graph extraction from ${file}.`);
      continue;
    }
    const literal = (node) =>
      node &&
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        ? node.text
        : null;
    const visit = (node) => {
      const i = parsed.getLineAndCharacterOfPosition(
        node.getStart(parsed),
      ).line;
      let specifier = null;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        specifier = literal(node.moduleSpecifier);
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      )
        specifier = literal(node.arguments[0]);
      if (specifier && connections.length < 100) {
        let target;
        if (specifier.startsWith(".")) {
          const relative = path.posix.normalize(
            path.posix.join(path.posix.dirname(file), specifier),
          );
          target = [
            relative,
            ...[".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.ts"].map(
              (ext) => relative + ext,
            ),
          ].find((p) => paths.has(p));
          if (target && !components.has(target))
            components.set(target, {
              name: target,
              description: "Local module referenced by a static import.",
              files: [target],
            });
        } else if (/^(?:@\/|~\/)/.test(specifier)) {
          limitations.add(
            "Path aliases are not resolved; alias-based graph edges are omitted.",
          );
        } else if (
          !specifier.startsWith("/") &&
          !specifier.startsWith("http")
        ) {
          target = specifier.startsWith("@")
            ? specifier.split("/").slice(0, 2).join("/")
            : specifier.split("/")[0];
          packages.add(target);
          components.set(target, {
            name: target,
            description:
              "External module referenced by a static import; runtime availability is not verified.",
            files: [],
          });
        }
        if (target)
          connections.push({
            from: file,
            to: target,
            description: `Static import observed at ${file}:${i + 1}.`,
          });
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const expr = node.expression;
        const method = expr.name.text;
        const route = literal(node.arguments[0]);
        if (
          ts.isIdentifier(expr.expression) &&
          ["app", "router"].includes(expr.expression.text) &&
          /^(get|post|put|patch|delete|options|head)$/i.test(method) &&
          route &&
          dataFlow.length < 30
        )
          dataFlow.push(
            `Literal ${method.toUpperCase()} ${route} route call at ${file}:${i + 1}; mounted prefixes and runtime behavior are not inferred.`,
          );
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(parsed, visit);
  }
  const bounded = [...components.values()].slice(0, 60);
  if (
    components.size > 60 ||
    connections.length >= 100 ||
    dataFlow.length >= 30
  )
    limitations.add(
      "Graph display limits were reached; some nodes, edges or route calls are omitted.",
    );
  const names = new Set(bounded.map((c) => c.name));
  return {
    components: bounded,
    connections: connections.filter(
      (c) => names.has(c.from) && names.has(c.to),
    ),
    dataFlow,
    technologies: [
      ...new Set([...(project.frameworks || []), ...packages]),
    ].slice(0, 60),
    limitations: [...limitations],
  };
}
export function buildDocument(project, manifests, architecture, format) {
  const lines = [],
    add = (...text) => lines.push(...text, "");
  const manifestPaths =
    manifests.map((m) => m.file).join(", ") || "none detected";
  const scripts = manifests.flatMap((m) =>
    Object.keys(m.scripts)
      .filter((name) => /^[a-zA-Z0-9_][\w:.-]*$/.test(name))
      .map((name) => ({
        file: m.file,
        name,
        command:
          name === "start" || name === "test"
            ? `npm ${name}`
            : `npm run ${name}`,
      })),
  );
  add(
    `# ${project.name}${format === "documentation" ? " — Developer documentation" : ""}`,
  );
  add(
    "## Overview",
    `This imported project contains ${project.fileCount} supported text files. This document is assembled from inspected manifests and static source observations, not inferred product claims.`,
    `Manifest evidence: ${manifestPaths}.`,
  );
  add(
    "## Features",
    ...(architecture.dataFlow.length
      ? architecture.dataFlow
      : [
          "User-facing capabilities are not verified by the available static evidence.",
        ]
    ).map((v) => `- ${v}`),
  );
  add(
    "## Tech Stack",
    `Source formats: ${project.languages.join(", ")}.`,
    ...manifests.flatMap((m) =>
      Object.entries(m.dependencies)
        .slice(0, 35)
        .map(
          ([name, version]) => `- ${name}: ${version} (declared in ${m.file})`,
        ),
    ),
  );
  add(
    "## Architecture",
    "The following relationships are static imports, not a complete runtime data-flow model.",
    ...(architecture.connections.length
      ? architecture.connections.map(
          (c) => `- ${c.from} → ${c.to}. ${c.description}`,
        )
      : [
          "No supported literal module imports were detected. Dynamic imports, aliases and non-JavaScript dependency graphs may be incomplete.",
        ]),
  );
  add(
    "## Installation",
    manifests.length
      ? "Node package manifests were found. After installing a compatible Node.js/npm version, use `npm install` from the directory containing the relevant package.json. Exact runtime versions are not verified here."
      : "Installation commands are unknown: no supported Node package manifest was inspected. Review the original project documentation.",
  );
  add(
    "## Configuration",
    "Required environment variables and runtime service configuration are not fully verified. Secret files are excluded from inspection. Review source and original configuration examples before running the project.",
  );
  add(
    "## Usage",
    ...(scripts.length
      ? scripts.map(
          (s) =>
            `- For ${s.file}, the declared ${s.name} script can be invoked with \`${s.command}\`.`,
        )
      : ["No supported package scripts were found. Commands are unknown."]),
  );
  add(
    "## Project Structure",
    ...project.files.slice(0, 40).map((f) => `- ${f.path} (${f.language})`),
    ...(project.fileCount > 40
      ? ["Additional files omitted from this listing."]
      : []),
  );
  add(
    "## API",
    ...(architecture.dataFlow.length
      ? architecture.dataFlow.map((v) => `- ${v}`)
      : [
          "No supported literal HTTP route declarations were detected. This does not prove that the project has no API.",
        ]),
  );
  add(
    "## Development",
    `Inspect ${manifestPaths} for exact scripts and declared dependency versions. Uploaded source and package scripts have not been executed.`,
  );
  const tests = scripts.filter((s) => /test/i.test(s.name));
  add(
    "## Testing",
    ...(tests.length
      ? tests.map((s) => `- Declared command: \`${s.command}\` (${s.file}).`)
      : ["No declared test script was found."]),
    "Test framework behavior, test coverage and passing status have not been verified.",
  );
  const deploy = scripts.filter((s) => /build|deploy|release/i.test(s.name));
  add(
    "## Deployment",
    ...(deploy.length
      ? deploy.map(
          (s) => `- Declared command to review: \`${s.command}\` (${s.file}).`,
        )
      : [
          "No deployment script was observed. Deployment instructions are unknown.",
        ]),
    "Validate environment, persistence, authentication and hosting requirements before deployment.",
  );
  add(
    "## Evidence and limitations",
    "This is a bounded static inspection. No tests, installs or uploaded commands were executed. Imports and literal route calls are parsed from JavaScript/TypeScript; they do not prove runtime behavior. See the analysis report for inspected-file coverage, truncation and failures.",
    ...(architecture.limitations || []),
  );
  return lines.join("\n");
}
