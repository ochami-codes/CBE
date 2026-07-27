// errors/errorHandler.js

export function errorHandler(err, req, res, next) {
  // Always log the full error on the backend.
  // Never expose the stack trace to the client.
  console.error("Unhandled error:", {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  /*
   * Operational errors are expected application errors
   * that are safe to communicate to the client.
   *
   * Examples:
   * - Invalid credentials
   * - Not found
   * - Forbidden
   * - Validation errors
   */
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details && {
        details: err.details,
      }),
    });
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
    code: "INTERNAL_SERVER_ERROR",
  });
}