import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
test("offline guard rejects remote DNS, TCP and fetch while allowing loopback endpoints", () => {
  const guard = new URL("../../scripts/offline-guard.mjs", import.meta.url)
    .href;
  const code = `import assert from 'node:assert/strict'; import net from 'node:net'; import dns from 'node:dns'; import {assertLocal} from ${JSON.stringify(guard)}; assertLocal('127.0.0.1'); assertLocal('::1'); assert.throws(()=>fetch('https://example.com'),{code:'OFFLINE_NETWORK_BLOCKED'}); assert.throws(()=>net.connect(443,'1.1.1.1'),{code:'OFFLINE_NETWORK_BLOCKED'}); assert.throws(()=>dns.lookup('example.com',()=>{}),{code:'OFFLINE_NETWORK_BLOCKED'}); console.log('GUARD_OK');`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    {
      encoding: "utf8",
      timeout: 10000,
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GUARD_OK/);
  assert.match(result.stdout, /"deniedChecks":3/);
});
