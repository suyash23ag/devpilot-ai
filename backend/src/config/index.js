import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const backend = fileURLToPath(new URL("../../", import.meta.url));
dotenv.config({ path: path.join(backend, ".env"), quiet: true });
// Offline operation must not inherit an unrelated shell's hosted tracing settings.
process.env.LANGCHAIN_TRACING_V2 = "false";
process.env.LANGSMITH_TRACING = "false";
const integer = (fallback, max) =>
  z.coerce.number().int().positive().max(max).default(fallback);
const schema = z.object({
  HOST: z.enum(["127.0.0.1", "localhost", "::1"]).default("127.0.0.1"),
  PORT: integer(5000, 65535),
  MONGODB_URI: z
    .string()
    .startsWith("mongodb")
    .default("mongodb://127.0.0.1:27017/devpilot"),
  OLLAMA_BASE_URL: z.url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("llama3.2:1b"),
  WORKSPACE_DIR: z.string().default("./workspace"),
  FRONTEND_ORIGIN: z.url().default("http://127.0.0.1:5173"),
  MAX_UPLOAD_BYTES: integer(10485760, 104857600),
  MAX_EXTRACTED_BYTES: integer(52428800, 524288000),
  MAX_FILE_SIZE: integer(1000000, 10000000),
  MAX_PROJECT_FILES: integer(1000, 10000),
  MAX_ANALYSIS_FILES: integer(30, 200),
  MAX_CONTEXT_CHARS: integer(12000, 64000),
  MAX_AGENT_STEPS: integer(10, 30),
  MODEL_TIMEOUT_MS: integer(120000, 600000),
  NUM_CTX: integer(4096, 32768),
});
export function readConfig(env = process.env) {
  const value = schema.parse(env);
  const url = new URL(value.OLLAMA_BASE_URL);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.protocol !== "http:"
  ) {
    throw new Error(
      "Ollama must use an unauthenticated local HTTP loopback URL",
    );
  }
  return {
    ...value,
    WORKSPACE_DIR: path.resolve(backend, value.WORKSPACE_DIR),
  };
}
export const config = readConfig();
