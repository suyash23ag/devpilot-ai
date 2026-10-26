import test from "node:test";
import assert from "node:assert/strict";
import {
  buildArchitecture,
  buildDocument,
} from "../../backend/src/tools/evidence.js";
const project = {
  name: "Fixture",
  fileCount: 4,
  languages: ["JavaScript", "JSON", "Markdown"],
  frameworks: ["express"],
  files: ["server.js", "helper.js", "package.json", "README.md"].map(
    (path) => ({ path, language: "JavaScript" }),
  ),
};
test("graph uses parsed imports and literal routes, excluding comments and strings", () => {
  const text = `import express from 'express';\nimport { helper } from './helper.js';\n// import fake from 'jest';\nconst example = "app.get('/fiction', callback)";\napp.get('/tasks', helper);`;
  const graph = buildArchitecture(project, [{ file: "server.js", text }]);
  assert.equal(graph.connections.length, 2);
  assert.ok(graph.connections.some((c) => c.to === "helper.js"));
  assert.ok(!graph.components.some((c) => c.name === "jest"));
  assert.equal(graph.dataFlow.length, 1);
  assert.match(graph.dataFlow[0], /GET \/tasks.*server.js:5/);
});
test("aliases and unsupported languages disclose graph limits instead of invented edges", () => {
  const graph = buildArchitecture(project, [
    { file: "server.js", text: "import x from '@/helpers';" },
    { file: "worker.py", text: "import os" },
  ]);
  assert.equal(graph.connections.length, 0);
  assert.ok(graph.limitations.some((s) => s.includes("aliases")));
  assert.ok(
    graph.limitations.some((s) => s.includes("Other source languages")),
  );
});
test("generated README only includes observed scripts and dependencies", () => {
  const graph = buildArchitecture(project, [
    {
      file: "server.js",
      text: "import express from 'express';\napp.get('/tasks', handler);",
    },
  ]);
  const markdown = buildDocument(
    project,
    [
      {
        file: "package.json",
        scripts: {
          start: "node server.js",
          test: "node --test",
          "bad;command": "danger",
        },
        dependencies: { express: "^5" },
        devDependencies: {},
      },
    ],
    graph,
    "readme",
  );
  assert.match(markdown, /npm start/);
  assert.match(markdown, /npm test/);
  assert.match(markdown, /express: \^5/);
  assert.doesNotMatch(
    markdown,
    /jest|bad;command|npm run build|single.page application/i,
  );
  assert.match(markdown, /not fully verified/);
  assert.match(markdown, /Testing/);
});
test("documents with no package manifest mark installation and commands unknown", () => {
  const graph = buildArchitecture(project, []);
  const markdown = buildDocument(project, [], graph, "documentation");
  assert.match(markdown, /Installation commands are unknown/);
  assert.match(markdown, /No declared test script/);
  assert.doesNotMatch(markdown, /npm install/);
});
test("graph edges always reference displayed nodes under display limits", () => {
  const text = Array.from(
    { length: 80 },
    (_, i) => `import x${i} from 'package-${i}';`,
  ).join("\n");
  const graph = buildArchitecture(project, [{ file: "server.js", text }]);
  const nodes = new Set(graph.components.map((c) => c.name));
  assert.equal(graph.components.length, 60);
  assert.ok(
    graph.connections.every((c) => nodes.has(c.from) && nodes.has(c.to)),
  );
  assert.ok(graph.limitations.length);
});
