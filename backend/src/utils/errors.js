export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data, error: null });
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const known = error instanceof AppError;
  const invalid = error.name === "ZodError";
  const upload = error.name === "MulterError";
  const large = error.type === "entity.too.large";
  const json = error.type === "entity.parse.failed";
  res
    .status(
      known
        ? error.status
        : large || upload
          ? 413
          : invalid || json
            ? 400
            : 500,
    )
    .json({
      success: false,
      data: null,
      error: {
        code: known
          ? error.code
          : invalid
            ? "INVALID_INPUT"
            : upload || large
              ? "UPLOAD_LIMIT"
              : json
                ? "INVALID_JSON"
                : "INTERNAL_ERROR",
        message: known
          ? error.message
          : invalid
            ? "Request fields are invalid."
            : upload || large
              ? "Request exceeds upload limits."
              : json
                ? "Request body is not valid JSON."
                : "The operation failed. Check local service availability.",
      },
    });
}
