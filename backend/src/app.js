import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createRouter } from "./routes/index.js";
import { AppError, errorHandler } from "./utils/errors.js";

export function createApp(config, runs) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
        },
      },
    }),
  );
  const origins = new Set([
    config.FRONTEND_ORIGIN,
    `http://127.0.0.1:${config.PORT}`,
    `http://localhost:${config.PORT}`,
  ]);
  app.use((req, res, next) => {
    if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(req.hostname))
      return next(
        new AppError("INVALID_HOST", "Only local access is supported.", 403),
      );
    if (req.headers.origin && !origins.has(req.headers.origin))
      return next(
        new AppError("INVALID_ORIGIN", "Request origin is not allowed.", 403),
      );
    next();
  });
  app.use(cors({ origin: [...origins] }));
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", createRouter(config, runs));
  app.use("/api", (req, res, next) =>
    next(new AppError("NOT_FOUND", "API route was not found.", 404)),
  );
  const frontend = fileURLToPath(
    new URL("../../frontend/dist", import.meta.url),
  );
  if (existsSync(frontend)) {
    app.use(express.static(frontend));
    app.get("/{*path}", (req, res) =>
      res.sendFile(path.join(frontend, "index.html")),
    );
  }
  app.use(errorHandler);
  return app;
}
