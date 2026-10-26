import mongoose from "mongoose";
mongoose.set("bufferCommands", false);
const { Schema } = mongoose;
const projectSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    originalFileName: String,
    workspacePath: { type: String, required: true, select: false },
    files: [{ _id: false, path: String, size: Number, language: String }],
    languages: [String],
    frameworks: [String],
    fileCount: Number,
    skippedCount: Number,
    status: { type: String, default: "ready" },
    indexMs: Number,
  },
  { timestamps: true },
);
const analysisSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    runId: Schema.Types.ObjectId,
    type: String,
    status: String,
    summary: String,
    findings: [Schema.Types.Mixed],
    markdown: String,
    architecture: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true },
);
const runSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    userRequest: String,
    type: String,
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "cancelled"],
      default: "queued",
    },
    toolsUsed: [String],
    executionSteps: [Schema.Types.Mixed],
    result: Schema.Types.Mixed,
    error: String,
  },
  { timestamps: true },
);
export const Project = mongoose.model("Project", projectSchema);
export const Analysis = mongoose.model("Analysis", analysisSchema);
export const AgentRun = mongoose.model("AgentRun", runSchema);
