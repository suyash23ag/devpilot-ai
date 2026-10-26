import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { z } from "zod";
import { AgentRun, Analysis } from "../models/index.js";
import {
  getProject,
  idSchema,
  projectControllers,
} from "../controllers/projects.js";
import { AppError, ok } from "../utils/errors.js";
import { ollamaStatus } from "../services/ollama.js";
import { requireDatabase } from "../middleware/database.js";

export const tasks = {
  analyze:
    "Analyze this project: inspect its structure, languages, dependencies and important source files. Explain its purpose and limitations with evidence.",
  "code-review":
    "Review this project for potential security and code-quality issues. Use both review tools and cite evidence. Do not claim pattern matches prove vulnerabilities.",
  readme:
    "Generate a README with overview, features, stack, architecture, installation, configuration, usage, structure, API, development, testing and deployment. Use only observed facts and scripts; mark unknown details.",
  documentation:
    "Generate developer documentation from source and manifests. Explain modules and configuration, cite paths, and mark unknown details.",
  architecture:
    "Explain architecture using components, connections, dataFlow and technologies. Inspect source and manifests; label filename-based inferences.",
  improvements:
    "Inspect this project and suggest prioritized code improvements supported by file evidence. Run code-quality and security checks where relevant.",
};
export function createRouter(config, runs) {
  const router = Router();
  router.get("/health", (req, res) =>
    ok(res, {
      status: mongoose.connection.readyState === 1 ? "ready" : "degraded",
      database: mongoose.connection.readyState === 1,
      model: config.OLLAMA_MODEL,
      activeRun: runs.active?.id || null,
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: process.memoryUsage().rss,
      ...(globalThis.__devpilotOfflineStats
        ? {
            networkPolicy: {
              mode: "loopback-only",
              ...globalThis.__devpilotOfflineStats,
            },
          }
        : {}),
    }),
  );
  router.get("/ollama/status", async (req, res) =>
    ok(res, await ollamaStatus(config)),
  );
  router.use(requireDatabase);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.MAX_UPLOAD_BYTES,
      files: 1,
      fields: 1,
      fieldSize: 200,
    },
  });
  const controller = projectControllers(config, runs);
  let importing = false;
  router.post(
    "/projects/upload",
    (req, res, next) => {
      if (importing)
        return next(
          new AppError(
            "IMPORT_BUSY",
            "Another project is being imported.",
            409,
          ),
        );
      importing = true;
      res.once("finish", () => {
        importing = false;
      });
      res.once("close", () => {
        importing = false;
      });
      upload.single("file")(req, res, next);
    },
    controller.upload,
  );
  router.get("/projects", controller.list);
  router.get("/projects/:id", controller.detail);
  router.get("/projects/:id/file", controller.file);
  router.delete("/projects/:id", controller.remove);
  async function start(projectId, userRequest, type, res) {
    const project = await getProject(projectId);
    if (project.status !== "ready")
      throw new AppError(
        "PROJECT_BUSY",
        "Project is not ready for analysis.",
        409,
      );
    const status = await ollamaStatus(config);
    if (!status.connected || !status.modelReady)
      throw new AppError(
        "MODEL_UNAVAILABLE",
        "Start Ollama and install the configured model before running analysis.",
        503,
      );
    ok(res, await runs.start(project, userRequest, type), 202);
  }
  router.post("/projects/:id/:action", async (req, res) => {
    const action = req.params.action;
    if (!Object.hasOwn(tasks, action))
      throw new AppError("ACTION_NOT_FOUND", "Unknown project action.", 404);
    await start(req.params.id, tasks[action], action, res);
  });
  router.post("/agent/run", async (req, res) => {
    const data = z
      .object({
        projectId: idSchema,
        userRequest: z.string().trim().min(5).max(2000),
      })
      .strict()
      .parse(req.body);
    await start(data.projectId, data.userRequest, "custom", res);
  });
  router.get("/agent/runs/:id", async (req, res) => {
    const run = await AgentRun.findById(idSchema.parse(req.params.id)).lean();
    if (!run) throw new AppError("RUN_NOT_FOUND", "Run was not found.", 404);
    ok(res, run);
  });
  router.post("/agent/runs/:id/cancel", async (req, res) =>
    ok(res, await runs.cancel(idSchema.parse(req.params.id))),
  );
  router.get("/analyses", async (req, res) =>
    ok(
      res,
      await Analysis.find()
        .select("-markdown -architecture -findings")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ),
  );
  return router;
}
