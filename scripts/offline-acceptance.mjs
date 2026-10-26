import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://127.0.0.1:5001";
const env = {
  ...process.env,
  PORT: "5001",
  HOST: "127.0.0.1",
  MONGODB_URI: "mongodb://127.0.0.1:27017/devpilot_acceptance",
  WORKSPACE_DIR: path.join(root, "backend/.local/offline-workspace"),
  FRONTEND_ORIGIN: base,
  LANGCHAIN_TRACING_V2: "true",
  LANGSMITH_TRACING: "true",
};
await fs.mkdir(path.join(root, "backend/.local"), { recursive: true });
let server,
  logs = "";
const checks = [];
async function request(url, options = {}) {
  const response = await fetch(`${base}/api${url}`, {
    ...options,
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "API failure");
  return body.data;
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const done = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await Promise.race([
    done,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
async function start() {
  server = spawn(
    process.execPath,
    [
      "--import",
      new URL("./offline-guard.mjs", import.meta.url).href,
      "backend/src/server.js",
    ],
    { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (chunk) => {
      logs = (logs + chunk).slice(-6000);
    });
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null)
      throw new Error("Offline server exited: " + logs);
    try {
      const health = await request("/health");
      if (health.database && health.networkPolicy?.mode === "loopback-only")
        return health;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Offline server did not become ready: " + logs);
}
async function command(script, args = [], extra = {}) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: root,
    env: { ...process.env, DEVPILOT_TEST_URL: base, ...extra },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  assert.equal(code, 0, `${script} did not pass`);
}
let report;
try {
  await start();
  checks.push("Fresh application startup with non-loopback networking blocked");
  await command("scripts/integration.mjs", ["--keep"], {
    DEVPILOT_REPORT_NAME: "integration-offline.json",
  });
  report = JSON.parse(
    await fs.readFile(
      path.join(root, "backend/.local/integration-offline.json"),
      "utf8",
    ),
  );
  checks.push(
    "All six real-model actions, with evidence-grounded document and graph assertions",
  );
  const before = await request("/analyses");
  assert.ok(before.length >= 6);
  await stop();
  await start();
  const after = await request("/analyses");
  assert.equal(after.length, before.length);
  assert.equal((await request(`/projects/${report.projectId}`)).fileCount, 4);
  for (const run of report.results)
    assert.equal(
      (await request(`/agent/runs/${run.runId}`)).status,
      "completed",
    );
  checks.push(
    "Guarded application restart, persisted project, analyses and results",
  );
  await command("scripts/lifecycle-check.mjs");
  checks.push("Validation, active-run exclusion, cancellation and deletion");
  const health = await request("/health");
  assert.equal(health.networkPolicy.deniedChecks, 0);
  await request(`/projects/${report.projectId}`, { method: "DELETE" });
  const output = {
    at: new Date().toISOString(),
    status: "passed",
    checks,
    networkPolicy: health.networkPolicy,
    model: (await request("/ollama/status")).model,
    results: report.results,
    scope:
      "Process-scoped network denial with local MongoDB and Ollama. OS internet, local daemon networking and physical Jetson operation were not disconnected or certified.",
  };
  await fs.mkdir(path.join(root, "docs/testing/evidence"), { recursive: true });
  await fs.writeFile(
    path.join(root, "docs/testing/evidence/offline-acceptance.json"),
    JSON.stringify(output, null, 2),
  );
  console.log("PASS offline acceptance and restart persistence");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
  await fs.writeFile(
    path.join(root, "backend/.local/offline-failure.json"),
    JSON.stringify({ checks, error: error.message, logs }, null, 2),
  );
} finally {
  await stop();
}
