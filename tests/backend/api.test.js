import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../backend/src/app.js";
import { readConfig } from "../../backend/src/config/index.js";
import { ollamaStatus } from "../../backend/src/services/ollama.js";
const app = createApp(readConfig({}), { active: null });
test("health reports actual degraded DB status without credentials", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.database, false);
  assert.equal(res.body.data.status, "degraded");
  assert.equal(res.headers["x-powered-by"], undefined);
});
test("project operations fail honestly without MongoDB", async () => {
  const res = await request(app).post("/api/projects/upload");
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, "DATABASE_UNAVAILABLE");
  assert.equal(res.body.data, null);
});
test("unexpected browser origins and DNS rebinding hosts are rejected", async () => {
  assert.equal(
    (
      await request(app)
        .get("/api/health")
        .set("Origin", "https://untrusted.example")
    ).status,
    403,
  );
  assert.equal(
    (await request(app).get("/api/health").set("Host", "untrusted.example"))
      .status,
    403,
  );
});
test("malformed JSON produces a sanitized client error", async () => {
  const res = await request(app)
    .post("/api/agent/run")
    .set("Content-Type", "application/json")
    .send("{broken");
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "INVALID_JSON");
  assert.equal(JSON.stringify(res.body).includes("SyntaxError"), false);
});
test("Ollama status distinguishes daemon and configured model", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ models: [{ name: "another:tag" }] }),
  });
  assert.deepEqual(await ollamaStatus(readConfig({})), {
    connected: true,
    model: "llama3.2:1b",
    modelReady: false,
    models: ["another:tag"],
  });
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  assert.equal((await ollamaStatus(readConfig({}))).connected, false);
});
