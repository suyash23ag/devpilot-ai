// Test-only fail-closed network policy. It does not change OS/network settings.
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
const allowed = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const stats = { allowedChecks: 0, deniedChecks: 0 };
export function assertLocal(host = "localhost") {
  if (!allowed.has(String(host).toLowerCase())) {
    stats.deniedChecks++;
    const error = new Error(
      "Offline test policy blocked a non-loopback destination.",
    );
    error.code = "OFFLINE_NETWORK_BLOCKED";
    throw error;
  }
  stats.allowedChecks++;
}
function inspect(args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (first && typeof first === "object") {
    if (first.path)
      throw Object.assign(
        new Error("IPC is not permitted by the offline TCP test."),
        { code: "OFFLINE_NETWORK_BLOCKED" },
      );
    assertLocal(first.host || first.hostname || "localhost");
  } else if (typeof first === "number")
    assertLocal(typeof args[1] === "string" ? args[1] : "localhost");
  else
    throw Object.assign(
      new Error("Unsupported network destination in offline test."),
      { code: "OFFLINE_NETWORK_BLOCKED" },
    );
}
for (const key of ["connect", "createConnection"]) {
  const original = net[key];
  net[key] = function (...args) {
    inspect(args);
    return original.apply(this, args);
  };
}
const socketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  inspect(args);
  return socketConnect.apply(this, args);
};
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  inspect(args);
  return tlsConnect.apply(this, args);
};
for (const key of [
  "lookup",
  "resolve",
  "resolve4",
  "resolve6",
  "resolveSrv",
  "resolveTxt",
]) {
  const original = dns[key];
  dns[key] = function (host, ...args) {
    assertLocal(host);
    return original.call(this, host, ...args);
  };
  if (dns.promises[key]) {
    const promiseOriginal = dns.promises[key];
    dns.promises[key] = function (host, ...args) {
      assertLocal(host);
      return promiseOriginal.call(this, host, ...args);
    };
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, options) {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  assertLocal(url.hostname);
  return originalFetch(input, { ...options, redirect: "error" });
};
syncBuiltinESMExports();
globalThis.__devpilotOfflineStats = stats;
process.on("exit", () =>
  console.log("OFFLINE_POLICY " + JSON.stringify(stats)),
);
