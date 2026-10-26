import { config } from "../backend/src/config/index.js";
const base = `http://${config.HOST}:${config.PORT}`;
let failed = false;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL ${name}: ${error.message}`);
  }
}
await check("API and MongoDB", async () => {
  const response = await fetch(`${base}/api/health`, {
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  if (!body.success || !body.data.database)
    throw new Error("API or MongoDB is not ready");
});
await check("Ollama and configured model", async () => {
  const response = await fetch(`${base}/api/ollama/status`, {
    signal: AbortSignal.timeout(6000),
  });
  const body = await response.json();
  if (!body.data?.connected || !body.data?.modelReady)
    throw new Error("Local daemon or model is unavailable");
});
if (!failed)
  await check("Real model inference", async () => {
    const response = await fetch(`${config.OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.OLLAMA_MODEL,
        prompt: 'Return the JSON object {"ready":true}.',
        format: "json",
        stream: false,
        options: { num_predict: 30, temperature: 0 },
      }),
      signal: AbortSignal.timeout(config.MODEL_TIMEOUT_MS),
    });
    const body = await response.json();
    if (!response.ok || JSON.parse(body.response).ready !== true)
      throw new Error("Model did not return the expected JSON");
  });
process.exitCode = failed ? 1 : 0;
