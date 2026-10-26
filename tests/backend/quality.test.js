import test from "node:test";
import assert from "node:assert/strict";
import { inspectFunctions } from "../../backend/src/tools/quality.js";
test("function review identifies bounded branching and naming cues with source lines", () => {
  const source = [
    "// fixture",
    "function f(value) {",
    ...Array.from(
      { length: 14 },
      (_, i) => `  if (value === ${i}) return ${i};`,
    ),
    "}",
  ];
  const result = inspectFunctions(source);
  assert.ok(result.some((f) => f.title.includes("name") && f.line === 2));
  assert.ok(
    result.some(
      (f) => f.title.includes("Branch-heavy") && f.confidence === "low",
    ),
  );
});
test("simple descriptive functions do not receive complexity findings", () => {
  assert.deepEqual(
    inspectFunctions([
      "function getTask(id) {",
      "  return tasks.get(id);",
      "}",
    ]),
    [],
  );
  assert.deepEqual(
    inspectFunctions([
      "def get_task(task_id):",
      "    return tasks[task_id]",
      'print("done")',
    ]),
    [],
  );
});
