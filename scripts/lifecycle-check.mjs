import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.DEVPILOT_TEST_URL || "http://127.0.0.1:5000";
async function request(url, options = {}) {
  const response = await fetch(`${base}/api${url}`, {
    ...options,
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: await response.json() };
}
assert.equal((await request("/projects/not-an-id")).status, 400);
const bytes = await fs.readFile(
  new URL("../tests/fixtures/task-api.zip", import.meta.url),
);
const form = new FormData();
form.append("name", "Disposable lifecycle verification");
form.append("file", new Blob([bytes]), "fixture.zip");
const imported = await request("/projects/upload", {
  method: "POST",
  body: form,
});
assert.equal(imported.status, 201);
const id = imported.body.data._id;
try {
  assert.equal(
    (await request(`/projects/${id}/file?path=../outside.js`)).status,
    404,
  );
  const started = await request("/agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: id,
      userRequest: "Analyze this demo project briefly.",
    }),
  });
  assert.equal(started.status, 202);
  const runId = started.body.data._id;
  assert.equal(
    (await request(`/projects/${id}`, { method: "DELETE" })).status,
    409,
  );
  assert.equal(
    (await request(`/projects/${id}/analyze`, { method: "POST" })).status,
    409,
  );
  await request(`/agent/runs/${runId}/cancel`, { method: "POST" });
  const deadline = Date.now() + 15000;
  let state;
  do {
    await new Promise((resolve) => setTimeout(resolve, 300));
    state = (await request(`/agent/runs/${runId}`)).body.data;
  } while (
    ["running", "queued"].includes(state.status) &&
    Date.now() < deadline
  );
  assert.equal(state.status, "cancelled");
  assert.equal((await request(`/projects/${id}`)).body.data.status, "ready");
  console.log(
    "PASS input validation, workspace lookup isolation, active-run exclusion and cancellation",
  );
} finally {
  const removed = await request(`/projects/${id}`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  assert.equal((await request(`/projects/${id}`)).status, 404);
  console.log("PASS project deletion and metadata cleanup");
}
