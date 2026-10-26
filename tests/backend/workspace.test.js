import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import yazl from "yazl";
import {
  extractProject,
  readSource,
  safeRelative,
} from "../../backend/src/services/workspace.js";
import { readConfig } from "../../backend/src/config/index.js";
const limits = readConfig({});
async function archive(entries) {
  const zip = new yazl.ZipFile();
  for (const [name, content, mode] of entries)
    zip.addBuffer(Buffer.from(content), name, mode ? { mode } : {});
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    zip.outputStream.on("data", (chunk) => chunks.push(chunk));
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on("error", reject);
  });
  zip.end();
  return done;
}
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "devpilot-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, "project");
}
test("valid import indexes source, excludes secrets and never executes code", async (t) => {
  const root = await fixture(t);
  const bytes = await archive([
    ["src/index.js", 'throw new Error("never execute me")'],
    ["package.json", '{"name":"fixture"}'],
    [".env", "SECRET=not-for-index"],
    ["node_modules/foo/index.js", "ignored"],
  ]);
  const result = await extractProject(bytes, root, limits);
  assert.equal(result.fileCount, 2);
  assert.equal(result.skippedCount, 2);
  assert.deepEqual(result.languages.sort(), ["JSON", "JavaScript"]);
  assert.match(await readSource(root, "src/index.js", 1000), /never execute/);
  await assert.rejects(fs.stat(path.join(root, ".env")));
});
test("rejects traversal, drive paths, devices and ambiguous Windows filenames", () => {
  for (const file of [
    "../file.js",
    "/tmp/file.js",
    "C:/file.js",
    "src\\file.js",
    "a/../../b.js",
    "NUL.js",
    "a./b.js",
    "a//b.js",
    "a\0.js",
  ])
    assert.throws(() => safeRelative(file));
  assert.equal(safeRelative("src/index.ts"), "src/index.ts");
});
test("malicious ZIP traversal leaves no workspace", async (t) => {
  const root = await fixture(t);
  const bytes = await archive([["safe.js", "hello"]]);
  const unsafe = Buffer.from(bytes);
  for (
    let i = unsafe.indexOf("safe.js");
    i !== -1;
    i = unsafe.indexOf("safe.js", i + 7)
  )
    unsafe.write("../x.js", i);
  await assert.rejects(extractProject(unsafe, root, limits));
  await assert.rejects(fs.stat(root));
});
test("rejects symlink entries, binaries, duplicate paths and binary text", async (t) => {
  const parent = path.dirname(await fixture(t));
  const variants = [
    [["link.js", "/outside", 0o120777]],
    [["bad.exe", "binary"]],
    [
      ["a.js", "a"],
      ["A.js", "b"],
    ],
    [["a.js", "\0binary"]],
  ];
  for (let i = 0; i < variants.length; i++) {
    const root = path.join(parent, `case${i}`);
    await assert.rejects(
      extractProject(await archive(variants[i]), root, limits),
    );
    await assert.rejects(fs.stat(root));
  }
});
test("enforces individual file, archive expansion and entry-count limits", async (t) => {
  const parent = path.dirname(await fixture(t));
  const bytes = await archive([
    ["a.js", "a".repeat(60)],
    ["b.js", "b".repeat(60)],
  ]);
  for (const [key, value] of [
    ["MAX_FILE_SIZE", 50],
    ["MAX_EXTRACTED_BYTES", 100],
    ["MAX_PROJECT_FILES", 1],
  ])
    await assert.rejects(
      extractProject(bytes, path.join(parent, key), {
        ...limits,
        [key]: value,
      }),
    );
});
test("file reads cannot escape a valid imported project", async (t) => {
  const root = await fixture(t);
  await extractProject(await archive([["a.js", "safe"]]), root, limits);
  await assert.rejects(readSource(root, "../outside.js", 100));
  await assert.rejects(readSource(root, "a.js", 2));
  await assert.rejects(readSource(root, ".env", 100));
});
test("configuration rejects hosted model endpoints and invalid budgets", () => {
  assert.throws(() => readConfig({ OLLAMA_BASE_URL: "https://example.com" }));
  assert.throws(() => readConfig({ MAX_AGENT_STEPS: "0" }));
  assert.equal(limits.OLLAMA_MODEL, "llama3.2:1b");
});
