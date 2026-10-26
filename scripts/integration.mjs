import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yazl from "yazl";
const base = process.env.DEVPILOT_TEST_URL || "http://127.0.0.1:5000";
const root = fileURLToPath(new URL("../", import.meta.url));
const zip = new yazl.ZipFile();
const files = {
  "package.json": JSON.stringify(
    {
      name: "task-api",
      version: "1.0.0",
      type: "module",
      scripts: { start: "node server.js", test: "node --test" },
      dependencies: { express: "^5.1.0" },
    },
    null,
    2,
  ),
  "server.js": `import express from 'express';
const app = express();
app.use(express.json());
const tasks = [];
app.get('/api/tasks', (req, res) => res.json(tasks));
app.post('/api/tasks', (req, res) => {
  if (typeof req.body.title !== 'string') return res.status(400).json({error: 'title required'});
  tasks.push({id: tasks.length + 1, title: req.body.title});
  res.status(201).json(tasks.at(-1));
});
app.listen(3000, '127.0.0.1');
`,
  "legacy.js": `// Legacy demonstration module, not imported by the server.\nexport function calculate(expression) { return eval(expression); }\n// TODO replace dynamic evaluation with a safe parser\n`,
  "README.md":
    "# Task API\nA minimal in-memory task API built with Express.\nInstall dependencies with npm install. Run npm start.\nGET /api/tasks lists tasks; POST /api/tasks accepts a JSON title.\nNo database is configured. Tasks are lost on restart.\n",
};
for (const [name, content] of Object.entries(files))
  zip.addBuffer(Buffer.from(content), name);
const chunks = [];
const bytes = new Promise((resolve, reject) => {
  zip.outputStream.on("data", (chunk) => chunks.push(chunk));
  zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
  zip.outputStream.on("error", reject);
});
zip.end();
const archive = await bytes;
await fs.mkdir(path.join(root, "tests/fixtures"), { recursive: true });
await fs.writeFile(path.join(root, "tests/fixtures/task-api.zip"), archive);
if (process.argv.includes("--fixture-only")) {
  console.log("Created tests/fixtures/task-api.zip");
  process.exit(0);
}
const report = [];
async function request(url, options) {
  const response = await fetch(`${base}/api${url}`, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(`${json.error?.code}: ${json.error?.message}`);
  return json.data;
}
let project;
try {
  const form = new FormData();
  form.append("name", "Demo · Task API");
  form.append("file", new Blob([archive]), "task-api.zip");
  project = await request("/projects/upload", { method: "POST", body: form });
  assert.equal(project.fileCount, 4);
  assert.equal(project.workspacePath, undefined);
  console.log(`PASS upload and indexing: ${project._id}`);
  const source = await request(`/projects/${project._id}/file?path=server.js`);
  assert.match(source.content, /express/);
  assert.ok((await request("/projects")).some((p) => p._id === project._id));
  console.log("PASS persisted project list and file inspection");
  const actions = process.env.DEVPILOT_TEST_ACTIONS?.split(",") || [
    "analyze",
    "code-review",
    "readme",
    "architecture",
    "documentation",
    "improvements",
  ];
  for (const action of actions) {
    const run = await request(`/projects/${project._id}/${action}`, {
      method: "POST",
    });
    const started = Date.now();
    let state;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      state = await request(`/agent/runs/${run._id}`);
      if (Date.now() - started > 360000) {
        await request(`/agent/runs/${run._id}/cancel`, { method: "POST" });
        throw new Error(`${action} exceeded live test timeout`);
      }
    } while (state.status === "running" || state.status === "queued");
    const entry = {
      action,
      status: state.status,
      runId: run._id,
      error: state.error,
      metadata: state.result?.metadata,
      findings: state.result?.findings.length,
      hasMarkdown: Boolean(state.result?.markdown),
      hasArchitecture: Boolean(state.result?.architecture),
    };
    report.push(entry);
    console.log(
      `${state.status === "completed" ? "PASS" : "FAIL"} ${action}: ${state.error || `${state.toolsUsed.length} tools, ${Date.now() - started} ms`}`,
    );
    if (state.status !== "completed") process.exitCode = 1;
    else {
      assert.ok(
        state.executionSteps.some((step) => step.stage === "evaluating"),
      );
      if (action === "code-review")
        assert.ok(
          state.result.findings.some(
            (f) => f.file === "legacy.js" && f.line === 2,
          ),
        );
      if (action === "readme" || action === "documentation") {
        const markdown = state.result.markdown;
        for (const heading of [
          "Overview",
          "Features",
          "Tech Stack",
          "Architecture",
          "Installation",
          "Configuration",
          "Usage",
          "Project Structure",
          "API",
          "Development",
          "Testing",
          "Deployment",
        ])
          assert.ok(markdown.includes(`## ${heading}`), `Missing ${heading}`);
        assert.match(markdown, /npm start/);
        assert.match(markdown, /npm test/);
        assert.doesNotMatch(
          markdown,
          /jest|single.page application|npm run build/i,
        );
        assert.match(markdown, /not fully verified/);
      }
      if (action === "architecture") {
        const graph = state.result.architecture;
        assert.ok(
          graph.connections.some(
            (c) => c.from === "server.js" && c.to === "express",
          ),
        );
        assert.ok(
          !graph.connections.some(
            (c) => c.to === "README.md" || c.from === "package.json",
          ),
        );
        assert.ok(graph.dataFlow.some((v) => v.includes("GET /api/tasks")));
      }
    }
  }
} finally {
  await fs.mkdir(path.join(root, "backend/.local"), { recursive: true });
  await fs.writeFile(
    path.join(
      root,
      "backend/.local",
      process.env.DEVPILOT_REPORT_NAME || "integration.json",
    ),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        projectId: project?._id,
        results: report,
      },
      null,
      2,
    ),
  );
  if (project && !process.argv.includes("--keep")) {
    await request(`/projects/${project._id}`, { method: "DELETE" });
    console.log("PASS project and analysis cleanup");
  }
}
