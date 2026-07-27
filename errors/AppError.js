// errors/AppError.js

export function createAppError(
  message,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
  details = null
) {
  const error = new Error(message);

  error.name = "AppError";
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;

  // Marks this as an expected application error
  // that is safe to expose to the client.
  error.isOperational = true;

  // Maintains a clean stack trace.
  Error.captureStackTrace(error, createAppError);

  return error;
}