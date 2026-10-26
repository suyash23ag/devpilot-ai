import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Project, Analysis, AgentRun } from "../models/index.js";
import { extractProject, readSource } from "../services/workspace.js";
import { AppError, ok } from "../utils/errors.js";

export const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
export async function getProject(id) {
  idSchema.parse(id);
  const project = await Project.findById(id).select("+workspacePath").lean();
  if (!project)
    throw new AppError("PROJECT_NOT_FOUND", "Project was not found.", 404);
  return project;
}
export function publicProject(project) {
  const { workspacePath, ...rest } = project.toObject
    ? project.toObject()
    : project;
  return rest;
}
export function projectControllers(config, runs) {
  return {
    async upload(req, res) {
      const { name } = z
        .object({ name: z.string().trim().min(1).max(100) })
        .parse(req.body);
      if (!req.file || !/\.zip$/i.test(req.file.originalname))
        throw new AppError("INVALID_UPLOAD", "Choose a ZIP archive.");
      const root = path.join(config.WORKSPACE_DIR, randomUUID());
      await fs.mkdir(config.WORKSPACE_DIR, { recursive: true });
      const indexed = await extractProject(req.file.buffer, root, config);
      try {
        const frameworks = new Set();
        for (const file of indexed.files
          .filter((f) => /(?:^|\/)package\.json$/.test(f.path))
          .slice(0, 5)) {
          try {
            const pkg = JSON.parse(
              await readSource(root, file.path, config.MAX_FILE_SIZE),
            );
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            for (const name of [
              "react",
              "next",
              "vue",
              "express",
              "vite",
              "mongoose",
              "angular",
              "svelte",
            ])
              if (deps[name]) frameworks.add(name);
          } catch {
            /* Invalid manifests remain available for explicit analysis errors. */
          }
        }
        const project = await Project.create({
          name,
          originalFileName: path.basename(req.file.originalname),
          workspacePath: root,
          ...indexed,
          frameworks: [...frameworks],
        });
        ok(res, publicProject(project), 201);
      } catch (error) {
        await fs.rm(root, { recursive: true, force: true });
        throw error;
      }
    },
    async list(req, res) {
      ok(
        res,
        await Project.find()
          .select("-files")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      );
    },
    async detail(req, res) {
      ok(res, publicProject(await getProject(req.params.id)));
    },
    async file(req, res) {
      const project = await getProject(req.params.id);
      const file = z.string().min(1).max(240).parse(req.query.path);
      if (!project.files.some((f) => f.path === file))
        throw new AppError("FILE_NOT_FOUND", "File was not found.", 404);
      ok(res, {
        path: file,
        content: await readSource(
          project.workspacePath,
          file,
          config.MAX_FILE_SIZE,
        ),
      });
    },
    async remove(req, res) {
      const project = await getProject(req.params.id);
      if (runs.active?.projectId === String(project._id))
        throw new AppError(
          "PROJECT_BUSY",
          "Cancel or finish the active analysis before deleting this project.",
          409,
        );
      const root = await fs.realpath(config.WORKSPACE_DIR);
      const target = path.resolve(project.workspacePath);
      if (
        path.dirname(target) !== root ||
        !/^[a-f\d-]{36}$/i.test(path.basename(target))
      )
        throw new AppError(
          "UNSAFE_PATH",
          "Project workspace could not be verified.",
        );
      // Keep an interrupted deletion distinguishable from a ready project.
      const claimed = await Project.updateOne(
        { _id: project._id, status: { $in: ["ready", "deleting"] } },
        { status: "deleting" },
      );
      if (!claimed.matchedCount)
        throw new AppError(
          "PROJECT_BUSY",
          "Project is currently being analyzed.",
          409,
        );
      await fs.rm(target, { recursive: true, force: true });
      await Analysis.deleteMany({ projectId: project._id });
      await AgentRun.deleteMany({ projectId: project._id });
      await Project.deleteOne({ _id: project._id });
      ok(res, { deleted: true });
    },
  };
}
