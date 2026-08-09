// errors/errorHandler.js

import { ERROR_CODES } from "./errorCodes.js";

/* --------------------------------
   Error Classification
--------------------------------- */

function classifyError(err) {
  /*
   * Node.js network / connection errors
   */
  if (err.code === "ECONNREFUSED") {
    return {
      statusCode: 503,
      code: ERROR_CODES.CONNECTION_REFUSED,
      message: "Unable to connect to the requested service.",
    };
  }

  if (err.code === "ECONNRESET") {
    return {
      statusCode: 503,
      code: ERROR_CODES.CONNECTION_RESET,
      message: "The connection was unexpectedly closed.",
    };
  }

  if (
    err.code === "ETIMEDOUT" ||
    err.code === "ESOCKETTIMEDOUT"
  ) {
    return {
      statusCode: 504,
      code: ERROR_CODES.REQUEST_TIMEOUT,
      message: "The request took too long to complete.",
    };
  }

  /*
   * PostgreSQL / database timeout
   *
   * PostgreSQL query timeout:
   * 57014 = query_canceled
   */
  if (
    err.code === "57014" ||
    err.code === "DB_TIMEOUT"
  ) {
    return {
      statusCode: 504,
      code: ERROR_CODES.DATABASE_TIMEOUT,
      message: "The database request took too long to complete.",
    };
  }

  /*
   * Generic database connection failure
   */
  if (
    err.code === "ECONNREFUSED" ||
    err.code === "08000" ||
    err.code === "08001" ||
    err.code === "08003" ||
    err.code === "08004" ||
    err.code === "08006"
  ) {
    return {
      statusCode: 503,
      code: ERROR_CODES.DATABASE_ERROR,
      message: "Unable to connect to the database.",
    };
  }

  /*
   * External service timeout
   */
  if (
    err.code === "EXTERNAL_SERVICE_TIMEOUT" ||
    err.name === "ExternalServiceTimeoutError"
  ) {
    return {
      statusCode: 504,
      code: ERROR_CODES.EXTERNAL_SERVICE_TIMEOUT,
      message: "An external service took too long to respond.",
    };
  }

  /*
   * Explicitly marked external service errors
   */
  if (
    err.code === ERROR_CODES.EXTERNAL_SERVICE_ERROR ||
    err.name === "ExternalServiceError"
  ) {
    return {
      statusCode: 503,
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      message: "An external service is currently unavailable.",
    };
  }

  return null;
}

/* --------------------------------
   Error Handler
--------------------------------- */

export function errorHandler(err, req, res, next) {
  /*
   * Always log the complete error on the backend.
   *
   * Never expose:
   * - stack traces
   * - database details
   * - internal error messages
   * - connection strings
   * - credentials
   */
  console.error("Unhandled error:", {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  /*
   * --------------------------------
   * 1. Known Network / Timeout Errors
   * --------------------------------
   */

  const classifiedError = classifyError(err);

  if (classifiedError) {
    return res.status(classifiedError.statusCode).json({
      success: false,
      message: classifiedError.message,
      code: classifiedError.code,
    });
  }

  /*
   * --------------------------------
   * 2. Operational Application Errors
   * --------------------------------
   *
   * Examples:
   * - Invalid credentials
   * - Not found
   * - Forbidden
   * - Validation errors
   * - Conflicts
   */
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      code: err.code || ERROR_CODES.INTERNAL_SERVER_ERROR,

      ...(err.details && {
        details: err.details,
      }),
    });
  }

  /*
   * --------------------------------
   * 3. Unknown / Unexpected Errors
   * --------------------------------
   *
   * Do not expose internal error information.
   */
  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
  });
}
