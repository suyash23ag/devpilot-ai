import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import yazl from "yazl";
import { extractProject } from "../backend/src/services/workspace.js";
import { createRegistry } from "../backend/src/tools/registry.js";
import { readConfig } from "../backend/src/config/index.js";
const root = fileURLToPath(new URL("../", import.meta.url)),
  config = readConfig({}),
  results = [];
const scratch = path.join(root, "backend/.local/benchmarks");
await fs.mkdir(scratch, { recursive: true });
async function archive(count) {
  const zip = new yazl.ZipFile(),
    chunks = [];
  let expandedBytes = 0;
  const add = (file, text) => {
    const b = Buffer.from(text);
    expandedBytes += b.length;
    zip.addBuffer(b, file);
  };
  add(
    "package.json",
    JSON.stringify({
      name: "benchmark",
      scripts: { start: "node server.js" },
      dependencies: { express: "^5" },
    }),
  );
  add("README.md", "# Generated benchmark fixture\n");
  add(
    "server.js",
    "import express from 'express';\nexport function calculate(input) { return eval(input); }\n",
  );
  for (let i = 0; i < count - 3; i++)
    add(
      `src/module-${String(i).padStart(4, "0")}.js`,
      `export function task${i}(value) { return value + ${i}; }\n` +
        "// fixture padding ".repeat(350) +
        "\n",
    );
  const done = new Promise((resolve, reject) => {
    zip.outputStream.on("data", (c) => chunks.push(c));
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on("error", reject);
  });
  zip.end();
  return { bytes: await done, expandedBytes };
}
for (const count of [100, 500, 1000]) {
  const fixture = await archive(count),
    destination = path.join(scratch, randomUUID());
  const cpu = process.cpuUsage();
  let peak = process.memoryUsage().rss;
  const sampler = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 5);
  try {
    const indexed = await extractProject(fixture.bytes, destination, config);
    assert.equal(indexed.fileCount, count);
    const registry = createRegistry(
      {
        ...indexed,
        name: "Benchmark",
        frameworks: ["express"],
        workspacePath: destination,
      },
      config,
    );
    let started = performance.now();
    const security = await registry.invoke(
      "find_potential_security_issues",
      {},
    );
    const securityMs = performance.now() - started;
    assert.ok(
      security.findings.some((f) => f.file === "server.js" && f.line === 2),
    );
    started = performance.now();
    await registry.invoke("find_code_quality_issues", {});
    const qualityMs = performance.now() - started;
    started = performance.now();
    await registry.invoke("analyze_project_structure", {});
    const structureMs = performance.now() - started;
    started = performance.now();
    await registry.invoke("generate_documentation", { format: "readme" });
    const documentMs = performance.now() - started;
    assert.ok(
      registry.coverage().inspectedFiles.length <= config.MAX_ANALYSIS_FILES,
    );
    results.push({
      files: count,
      expandedBytes: fixture.expandedBytes,
      compressedBytes: fixture.bytes.length,
      indexMs: indexed.indexMs,
      securityMs: Math.round(securityMs),
      qualityMs: Math.round(qualityMs),
      structureMs: Math.round(structureMs),
      documentMs: Math.round(documentMs),
      inspectedFiles: registry.coverage().inspectedFiles.length,
      fileBudget: config.MAX_ANALYSIS_FILES,
      findings: security.findings.length,
      peakSampledRssBytes: Math.max(peak, process.memoryUsage().rss),
      cpuMicroseconds: process.cpuUsage(cpu),
    });
    console.log(
      `PASS ${count} files: ${indexed.indexMs} ms indexing, ${registry.coverage().inspectedFiles.length} files inspected`,
    );
  } finally {
    clearInterval(sampler);
    assert.equal(path.dirname(destination), scratch);
    await fs.rm(destination, { recursive: true, force: true });
  }
}
const oversized = await archive(1001),
  rejected = path.join(scratch, randomUUID());
await assert.rejects(
  extractProject(oversized.bytes, rejected, config),
  (e) => e.code === "ARCHIVE_LIMIT",
);
await assert.rejects(fs.stat(rejected));
const output = {
  at: new Date().toISOString(),
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  cpu: os.cpus()[0]?.model,
  logicalCpus: os.cpus().length,
  systemMemoryBytes: os.totalmem(),
  scope:
    "Synthetic ZIP extraction and deterministic tools in this benchmark process. Not full-system, LLM or Jetson GPU measurements.",
  results,
  limits: { over1000EntriesRejected: true, fileBudgetEnforced: true },
};
await fs.mkdir(path.join(root, "docs/testing/evidence"), { recursive: true });
await fs.writeFile(
  path.join(root, "docs/testing/evidence/performance.json"),
  JSON.stringify(output, null, 2),
);
console.log("PASS over-limit archive rejected and partial data removed");
