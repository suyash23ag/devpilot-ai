import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRegistry } from "../../backend/src/tools/registry.js";
import { runAgent } from "../../backend/src/agents/orchestrator.js";
import { readConfig } from "../../backend/src/config/index.js";
const config = readConfig({});
test("project explanations inspect source even when a README exists", async (t) => {
  const project = await setup(t);
  await fs.writeFile(
    path.join(project.workspacePath, "README.md"),
    "# Fixture\nSmall example.",
  );
  project.files.push({ path: "README.md", size: 24, language: "Markdown" });
  project.fileCount++;
  const model = async (system, input) =>
    input.phase === "plan"
      ? { calls: [{ tool: "detect_languages", args: {} }] }
      : input.phase === "evaluate"
        ? { decision: "finish" }
        : { summary: "Source and README inspected.", markdown: "" };
  const result = await runAgent({
    project,
    userRequest: "Explain the project",
    type: "analyze",
    registry: createRegistry(project, config),
    config,
    model,
  });
  assert.ok(result.metadata.inspectedFiles.includes("README.md"));
  assert.ok(result.metadata.inspectedFiles.includes("index.js"));
});
async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "devpilot-agent-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(root, "index.js"),
    'const apiKey = "example123456";\neval(userInput);\n// TODO review\n',
  );
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "fixture",
      scripts: { dev: "node index.js" },
      dependencies: { express: "^5" },
    }),
  );
  return {
    name: "fixture",
    fileCount: 2,
    languages: ["JavaScript", "JSON"],
    frameworks: ["express"],
    workspacePath: root,
    files: [
      { path: "index.js", size: 75, language: "JavaScript" },
      { path: "package.json", size: 100, language: "JSON" },
    ],
  };
}
test("tool registry validates calls and returns file/line evidence", async (t) => {
  const registry = createRegistry(await setup(t), config);
  await assert.rejects(registry.invoke("shell", { command: "whoami" }));
  await assert.rejects(registry.invoke("read_file", { path: "../outside.js" }));
  await assert.rejects(
    registry.invoke("read_file", { path: "index.js", maxLines: 5000 }),
  );
  const result = await registry.invoke("find_potential_security_issues", {});
  assert.equal(result.findings[0].line, 2);
  assert.equal(result.findings[0].file, "index.js");
  const manifest = await registry.invoke("analyze_package_dependencies", {});
  assert.equal(manifest.manifests[0].scripts.dev, "node index.js");
});
test("model plans tools, evaluates observations, requests another step and finishes", async (t) => {
  const project = await setup(t),
    events = [],
    calls = [];
  const replies = [
    { calls: [{ tool: "analyze_project_structure", args: {} }] },
    {
      decision: "continue",
      calls: [{ tool: "find_potential_security_issues", args: {} }],
    },
    { decision: "finish" },
    { summary: "Dynamic evaluation requires review.", markdown: "" },
  ];
  const result = await runAgent({
    project,
    userRequest: "Review source",
    type: "custom",
    registry: createRegistry(project, config),
    config,
    emit: async (e) => events.push(e),
    model: async (system, input, schema) => {
      calls.push(input);
      return schema.parse(replies.shift());
    },
  });
  assert.equal(calls.length, 4);
  assert.equal(result.findings[0].line, 2);
  assert.ok(events.some((e) => e.stage === "evaluating"));
  assert.equal(events.at(-1).stage, "completed");
  assert.ok(result.metadata.inspectedFiles.includes("index.js"));
});
test("invalid tools cannot produce successful evidence-free analysis", async (t) => {
  const project = await setup(t);
  await assert.rejects(
    runAgent({
      project,
      userRequest: "Task",
      type: "custom",
      registry: createRegistry(project, config),
      config,
      model: async () => ({
        calls: [{ tool: "read_file", args: { path: "missing.js" } }],
      }),
    }),
    /No tool completed/,
  );
});
test("tool failures remain in metadata when other evidence succeeds", async (t) => {
  const project = await setup(t);
  const result = await runAgent({
    project,
    userRequest: "Task",
    type: "custom",
    registry: createRegistry(project, config),
    config,
    model: async (system, input) =>
      input.phase === "plan"
        ? {
            calls: [
              { tool: "read_file", args: { path: "absent.js" } },
              { tool: "detect_languages", args: {} },
            ],
          }
        : input.phase === "evaluate"
          ? { decision: "finish" }
          : { summary: "Language metadata only.", markdown: "" },
  });
  assert.equal(result.metadata.toolErrors.length, 1);
});
test("cancellation prevents model work and step budgets prevent additional tools", async (t) => {
  const project = await setup(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    runAgent({
      project,
      registry: createRegistry(project, config),
      config,
      signal: controller.signal,
      model: async () => {
        throw new Error("must not run");
      },
    }),
    /cancelled/,
  );
  const result = await runAgent({
    project,
    userRequest: "Task",
    type: "custom",
    registry: createRegistry(project, config),
    config: { ...config, MAX_AGENT_STEPS: 1 },
    model: async (system, input) =>
      input.phase === "plan"
        ? { calls: [{ tool: "detect_languages", args: {} }] }
        : input.phase === "evaluate"
          ? {
              decision: "continue",
              calls: [{ tool: "analyze_project_structure", args: {} }],
            }
          : {
              summary: "Language metadata only; tool budget reached.",
              markdown: "",
            },
  });
  assert.deepEqual(result.metadata.toolsUsed, ["detect_languages"]);
  assert.equal(result.metadata.budgetReached, true);
});
test("code review enforces evidence requirements even when planner skips them", async (t) => {
  const project = await setup(t);
  const model = async (system, input) =>
    input.phase === "plan"
      ? { calls: [{ tool: "detect_languages", args: {} }] }
      : input.phase === "evaluate"
        ? { decision: "finish" }
        : { summary: "Potential issues require review.", markdown: "" };
  const result = await runAgent({
    project,
    userRequest: "Review",
    type: "code-review",
    registry: createRegistry(project, config),
    config,
    model,
  });
  assert.ok(
    result.metadata.toolsUsed.includes("find_potential_security_issues"),
  );
  assert.ok(result.metadata.toolsUsed.includes("find_code_quality_issues"));
  await assert.rejects(
    runAgent({
      project,
      userRequest: "Review",
      type: "code-review",
      registry: createRegistry(project, config),
      config: { ...config, MAX_AGENT_STEPS: 1 },
      model,
    }),
    /Required evidence/,
  );
});
