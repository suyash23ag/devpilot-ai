import mongoose from "mongoose";
import { config } from "./config/index.js";
import { createApp } from "./app.js";
import { makeModel } from "./services/ollama.js";
import { RunService } from "./services/runs.js";

const runs = new RunService(config, makeModel(config));
const server = createApp(config, runs).listen(config.PORT, config.HOST, () =>
  console.log(`DevPilot API listening on http://${config.HOST}:${config.PORT}`),
);
let connecting = false,
  recovered = false;
async function connect() {
  if (connecting || mongoose.connection.readyState === 1) return;
  connecting = true;
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      maxPoolSize: 5,
    });
    if (!recovered) {
      await runs.recover();
      recovered = true;
    }
    console.log("Local database connected.");
  } catch {
    console.warn(
      "Local database unavailable; retrying. Health endpoints remain available.",
    );
  } finally {
    connecting = false;
  }
}
void connect();
const retry = setInterval(connect, 10000);
async function shutdown() {
  clearInterval(retry);
  runs.active?.controller.abort();
  server.close();
  await mongoose.disconnect();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
