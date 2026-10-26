import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { makeModel } from "../../backend/src/services/ollama.js";
import { readConfig } from "../../backend/src/config/index.js";
const schema = z.object({ ready: z.boolean() });
test("model adapter supplies a constrained JSON schema and retries invalid output once", async () => {
  let calls = 0;
  const model = makeModel(readConfig({}), () => ({
    invoke: async (messages, options) => {
      assert.equal(options.format.type, "object");
      assert.equal(options.format.properties.ready.type, "boolean");
      return { content: ++calls === 1 ? "not valid JSON" : '{"ready":true}' };
    },
  }));
  assert.deepEqual(await model("JSON only", {}, schema), { ready: true });
  assert.equal(calls, 2);
});
test("persistent invalid JSON fails without a fabricated response", async () => {
  let calls = 0;
  const model = makeModel(readConfig({}), () => ({
    invoke: async () => {
      calls++;
      return { content: '{"wrong":true}' };
    },
  }));
  await assert.rejects(
    model("JSON only", {}, schema),
    (error) => error.code === "INVALID_MODEL_OUTPUT",
  );
  assert.equal(calls, 2);
});
test("transport failure and cancellation are explicit and sanitized", async () => {
  const model = makeModel(readConfig({}), () => ({
    invoke: async () => {
      throw new Error("internal detail that should not escape");
    },
  }));
  await assert.rejects(
    model("JSON only", {}, schema),
    (error) =>
      error.code === "MODEL_UNAVAILABLE" &&
      !error.message.includes("internal detail"),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    model("JSON only", {}, schema, controller.signal),
    (error) => error.code === "CANCELLED",
  );
});
