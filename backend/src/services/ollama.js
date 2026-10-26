import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import { AppError } from "../utils/errors.js";

export async function ollamaStatus(config) {
  try {
    const response = await fetch(`${config.OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("Unavailable");
    const json = await response.json();
    const models = (json.models || []).map((item) => item.name);
    return {
      connected: true,
      model: config.OLLAMA_MODEL,
      modelReady: models.includes(config.OLLAMA_MODEL),
      models,
    };
  } catch {
    return {
      connected: false,
      model: config.OLLAMA_MODEL,
      modelReady: false,
      models: [],
    };
  }
}
export function makeModel(
  config,
  createChat = (options) => new ChatOllama(options),
) {
  return async (system, input, schema, signal) => {
    const model = createChat({
      baseUrl: config.OLLAMA_BASE_URL,
      model: config.OLLAMA_MODEL,
      temperature: 0.1,
      numCtx: config.NUM_CTX,
      numPredict:
        input.phase === "plan" ? 500 : input.phase === "evaluate" ? 250 : 1800,
      maxRetries: 0,
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      let response;
      try {
        response = await model.invoke(
          [
            {
              role: "system",
              content:
                system +
                (attempt
                  ? "\nYour previous output was invalid. Return only a JSON object matching the required schema."
                  : ""),
            },
            { role: "user", content: JSON.stringify(input) },
          ],
          {
            format: z.toJSONSchema(schema),
            signal: AbortSignal.any([
              signal || new AbortController().signal,
              AbortSignal.timeout(config.MODEL_TIMEOUT_MS),
            ]),
          },
        );
      } catch {
        if (signal?.aborted)
          throw new AppError("CANCELLED", "Run cancelled.", 409);
        throw new AppError(
          "MODEL_UNAVAILABLE",
          "Local model request failed or timed out. Check Ollama and the configured model.",
          503,
        );
      }
      try {
        if (
          typeof response.content !== "string" ||
          response.content.length > 24000
        )
          throw new Error("Invalid output");
        return schema.parse(JSON.parse(response.content));
      } catch {
        /* One bounded retry for small-model JSON failures. */
      }
    }
    throw new AppError(
      "INVALID_MODEL_OUTPUT",
      "The local model did not return valid structured output. Try a narrower task.",
      502,
    );
  };
}
