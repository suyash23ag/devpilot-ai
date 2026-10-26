import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import { AppError } from "../utils/errors.js";

export const languages = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".py": "Python",
  ".java": "Java",
  ".cpp": "C++",
  ".h": "C/C++",
  ".c": "C",
  ".html": "HTML",
  ".css": "CSS",
  ".json": "JSON",
  ".md": "Markdown",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".toml": "TOML",
};
const ignored = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "__MACOSX",
]);
const binaries = new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".com",
  ".bat",
  ".cmd",
  ".ps1",
  ".msi",
  ".scr",
]);
export function safeRelative(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 240 ||
    /[\\\x00-\x1f:]/.test(value) ||
    value.startsWith("/")
  )
    throw new AppError("UNSAFE_PATH", "Unsafe project path.");
  const parts = value.replace(/\/$/, "").split("/");
  if (
    parts.some(
      (p) =>
        !p ||
        p === "." ||
        p === ".." ||
        /[. ]$/.test(p) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p),
    )
  )
    throw new AppError("UNSAFE_PATH", "Unsafe project path.");
  return parts.join("/");
}
export function isSupported(file) {
  return Boolean(languages[path.posix.extname(file).toLowerCase()]);
}
export function excluded(file) {
  return file
    .split("/")
    .some(
      (p) =>
        ignored.has(p) ||
        /^\.env(?:\.|$)/i.test(p) ||
        /^(credentials|secrets)(?:\.|$)/i.test(p) ||
        /\.(pem|key|p12|pfx)$/i.test(p),
    );
}
export async function resolveFile(root, relative) {
  const valid = safeRelative(relative);
  if (!isSupported(valid) || excluded(valid))
    throw new AppError(
      "UNSUPPORTED_FILE",
      "This file is excluded from inspection.",
    );
  const realRoot = await fs.realpath(root);
  let current = realRoot;
  for (const segment of valid.split("/")) {
    current = path.join(current, segment);
    const stat = await fs.lstat(current).catch(() => {
      throw new AppError("FILE_NOT_FOUND", "File was not found.", 404);
    });
    if (stat.isSymbolicLink())
      throw new AppError("UNSAFE_PATH", "Symbolic links cannot be inspected.");
  }
  const real = await fs.realpath(current);
  if (!real.startsWith(realRoot + path.sep))
    throw new AppError("UNSAFE_PATH", "File is outside the project.");
  return real;
}
export async function readSource(root, relative, maxSize) {
  const target = await resolveFile(root, relative);
  const handle = await fs.open(target, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxSize)
      throw new AppError("FILE_LIMIT", "File exceeds the inspection limit.");
    const bytes = Buffer.alloc(Math.min(maxSize + 1, stat.size + 1));
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > maxSize)
      throw new AppError("FILE_LIMIT", "File exceeds the inspection limit.");
    const text = bytes.subarray(0, bytesRead).toString("utf8");
    if (text.includes("\0"))
      throw new AppError("BINARY_FILE", "Binary content cannot be inspected.");
    return text;
  } finally {
    await handle.close();
  }
}

export async function extractProject(buffer, destination, limits) {
  const start = performance.now();
  await fs.mkdir(destination, { recursive: false });
  let zip;
  try {
    zip = await new Promise((resolve, reject) =>
      yauzl.fromBuffer(
        buffer,
        { lazyEntries: true, validateEntrySizes: true },
        (err, value) => (err ? reject(err) : resolve(value)),
      ),
    );
    let entries = 0,
      total = 0,
      skippedCount = 0;
    const seen = new Set(),
      files = [];
    await new Promise((resolve, reject) => {
      let failed = false;
      const fail = (error) => {
        if (!failed) {
          failed = true;
          zip.close();
          reject(error);
        }
      };
      zip.on("error", fail);
      zip.on("end", resolve);
      zip.on("entry", (entry) => {
        (async () => {
          if (++entries > limits.MAX_PROJECT_FILES)
            throw new AppError(
              "ARCHIVE_LIMIT",
              "Archive has too many entries.",
            );
          const relative = safeRelative(entry.fileName);
          const key = relative.toLowerCase();
          if (seen.has(key))
            throw new AppError(
              "DUPLICATE_PATH",
              "Archive contains duplicate paths.",
            );
          seen.add(key);
          const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
          if (mode && mode !== 0x8000 && mode !== 0x4000)
            throw new AppError(
              "UNSAFE_ARCHIVE",
              "Archive links and special files are not allowed.",
            );
          if (entry.generalPurposeBitFlag & 1)
            throw new AppError(
              "UNSAFE_ARCHIVE",
              "Encrypted archives are not supported.",
            );
          total += entry.uncompressedSize;
          if (total > limits.MAX_EXTRACTED_BYTES)
            throw new AppError(
              "ARCHIVE_LIMIT",
              "Expanded archive exceeds the size limit.",
            );
          if (entry.fileName.endsWith("/")) return;
          if (excluded(relative)) {
            skippedCount++;
            return;
          }
          if (binaries.has(path.posix.extname(relative).toLowerCase()))
            throw new AppError(
              "UNSAFE_ARCHIVE",
              "Executable binaries and command scripts are not accepted.",
            );
          if (!isSupported(relative)) {
            skippedCount++;
            return;
          }
          if (entry.uncompressedSize > limits.MAX_FILE_SIZE)
            throw new AppError(
              "FILE_LIMIT",
              "A source file exceeds the size limit.",
            );
          const target = path.join(destination, ...relative.split("/"));
          await fs.mkdir(path.dirname(target), { recursive: true });
          const stream = await new Promise((yes, no) =>
            zip.openReadStream(entry, (err, value) =>
              err ? no(err) : yes(value),
            ),
          );
          let actual = 0;
          const guard = new Transform({
            transform(chunk, enc, callback) {
              actual += chunk.length;
              if (
                actual > entry.uncompressedSize ||
                actual > limits.MAX_FILE_SIZE ||
                chunk.includes(0)
              )
                callback(
                  new AppError(
                    "UNSAFE_ARCHIVE",
                    "Invalid source content or expanded size.",
                  ),
                );
              else callback(null, chunk);
            },
          });
          await pipeline(
            stream,
            guard,
            createWriteStream(target, { flags: "wx", mode: 0o600 }),
          );
          files.push({
            path: relative,
            size: actual,
            language: languages[path.posix.extname(relative).toLowerCase()],
          });
        })().then(() => {
          if (!failed) zip.readEntry();
        }, fail);
      });
      zip.readEntry();
    });
    if (!files.length)
      throw new AppError(
        "EMPTY_PROJECT",
        "Archive has no supported source files.",
      );
    files.sort((a, b) => a.path.localeCompare(b.path));
    return {
      files,
      fileCount: files.length,
      skippedCount,
      languages: [...new Set(files.map((f) => f.language))],
      indexMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    zip?.close();
    await fs.rm(destination, { recursive: true, force: true });
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_ARCHIVE",
      "Archive could not be safely extracted.",
    );
  }
}
