import { AgentRun, Analysis, Project } from "../models/index.js";
import { createRegistry } from "../tools/registry.js";
import { runAgent } from "../agents/orchestrator.js";
import { AppError } from "../utils/errors.js";

export class RunService {
  constructor(config, model) {
    this.config = config;
    this.model = model;
    this.active = null;
  }
  async start(project, userRequest, type) {
    if (this.active)
      throw new AppError(
        "AGENT_BUSY",
        "A local analysis is already running. Wait or cancel it before starting another.",
        409,
      );
    const controller = new AbortController();
    this.active = { projectId: String(project._id), controller, id: null };
    let run;
    try {
      const claimed = await Project.updateOne(
        { _id: project._id, status: "ready" },
        { status: "analyzing" },
      );
      if (!claimed.matchedCount)
        throw new AppError(
          "PROJECT_BUSY",
          "Project is no longer ready for analysis.",
          409,
        );
      run = await AgentRun.create({
        projectId: project._id,
        userRequest,
        type,
        status: "queued",
        toolsUsed: [],
        executionSteps: [],
      });
      this.active.id = String(run._id);
    } catch (error) {
      await Project.updateOne(
        { _id: project._id, status: "analyzing" },
        { status: "ready" },
      ).catch(() => {});
      this.active = null;
      throw error;
    }
    void this.execute(project, run, controller).catch(() => {
      this.active = null;
    });
    return run;
  }
  async execute(project, run, controller) {
    try {
      await AgentRun.updateOne({ _id: run._id }, { status: "running" });
      const result = await runAgent({
        project,
        userRequest: run.userRequest,
        type: run.type,
        registry: createRegistry(project, this.config),
        model: this.model,
        config: this.config,
        signal: controller.signal,
        emit: async (event) => {
          await AgentRun.updateOne(
            { _id: run._id },
            {
              $push: {
                executionSteps: { ...event, at: new Date().toISOString() },
              },
              ...(event.tool ? { $addToSet: { toolsUsed: event.tool } } : {}),
            },
          );
        },
      });
      if (controller.signal.aborted)
        throw new AppError("CANCELLED", "Run cancelled.");
      await Analysis.create({
        projectId: project._id,
        runId: run._id,
        type: run.type,
        status: "completed",
        ...result,
      });
      await AgentRun.updateOne(
        { _id: run._id },
        { status: "completed", result },
      );
    } catch (error) {
      const cancelled = controller.signal.aborted;
      await AgentRun.updateOne(
        { _id: run._id },
        {
          status: cancelled ? "cancelled" : "failed",
          error: cancelled
            ? "Run cancelled."
            : error instanceof AppError
              ? error.message
              : "Analysis failed. Check database and local runtime availability.",
        },
      );
    } finally {
      await Project.updateOne(
        { _id: project._id, status: "analyzing" },
        { status: "ready" },
      );
      this.active = null;
    }
  }
  async cancel(id) {
    if (this.active?.id === id) {
      this.active.controller.abort();
      return { status: "cancelling" };
    }
    const run = await AgentRun.findById(id);
    if (!run) throw new AppError("RUN_NOT_FOUND", "Run was not found.", 404);
    return { status: run.status };
  }
  async recover() {
    await AgentRun.updateMany(
      { status: { $in: ["queued", "running"] } },
      {
        status: "failed",
        error:
          "The local server restarted before this run finished. Start a new analysis.",
      },
    );
    await Project.updateMany({ status: "analyzing" }, { status: "ready" });
  }
}
