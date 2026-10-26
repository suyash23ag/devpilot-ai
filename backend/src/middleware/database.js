import mongoose from "mongoose";
import { AppError } from "../utils/errors.js";
export function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1)
    return next(
      new AppError(
        "DATABASE_UNAVAILABLE",
        "MongoDB is unavailable. Start the local database to use projects and analyses.",
        503,
      ),
    );
  next();
}
