// errors/notFoundHandler.js

import { createAppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

export function notFoundHandler(req, res, next) {
  next(
    createAppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      ERROR_CODES.NOT_FOUND
    )
  );
}