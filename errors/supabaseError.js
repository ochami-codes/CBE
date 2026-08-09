// errors/supabaseError.js

import { createAppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/* --------------------------------
   Helpers
--------------------------------- */

/**
 * Safely convert an unknown error
 * into a readable string.
 */
function getErrorMessage(error) {
  return (
    error?.message ||
    error?.error_description ||
    ""
  ).toLowerCase();
}

/**
 * Detect network-level errors.
 *
 * These errors generally mean the request
 * failed before Supabase could return a
 * normal API response.
 */
function isNetworkError(error) {
  const code = error?.code;

  const networkCodes = [
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "ENETUNREACH",
  ];

  if (networkCodes.includes(code)) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("fetch failed") ||
    message.includes("network error") ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("connection refused") ||
    message.includes("connection reset") ||
    message.includes("timeout")
  );
}

/**
 * Detect timeout errors.
 */
function isTimeoutError(error) {
  const code = error?.code;

  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKETTIMEDOUT"
  ) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("timeout") ||
    message.includes("timed out")
  );
}

/* --------------------------------
   Authentication Errors
--------------------------------- */

/**
 * Convert a Supabase Auth error into
 * an application-level AppError.
 */
export function mapSupabaseAuthError(error) {
  if (!error) {
    return null;
  }

  /* -----------------------------
     Network Error
  ------------------------------ */

  if (isNetworkError(error)) {
    if (isTimeoutError(error)) {
      return createAppError(
        "The authentication service took too long to respond.",
        504,
        ERROR_CODES.EXTERNAL_SERVICE_TIMEOUT
      );
    }

    return createAppError(
      "Unable to connect to the authentication service.",
      503,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR
    );
  }

  const message = getErrorMessage(error);

  /* -----------------------------
     Invalid Credentials
  ------------------------------ */

  if (
    error.code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return createAppError(
      "Invalid email or password.",
      400,
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  /* -----------------------------
     Email Not Confirmed
  ------------------------------ */

  if (
    message.includes("email not confirmed") ||
    message.includes("email confirmation")
  ) {
    return createAppError(
      "Please verify your email before logging in.",
      400,
      ERROR_CODES.EMAIL_NOT_CONFIRMED
    );
  }

  /* -----------------------------
     Rate Limit
  ------------------------------ */

  if (
    error.status === 429 ||
    error.code === "over_request_rate_limit"
  ) {
    return createAppError(
      "Too many authentication attempts. Please try again later.",
      429,
      ERROR_CODES.SERVICE_UNAVAILABLE
    );
  }

  /* -----------------------------
     Generic Auth Error
  ------------------------------ */

  return createAppError(
    "Authentication service is currently unavailable.",
    503,
    ERROR_CODES.EXTERNAL_SERVICE_ERROR
  );
}

/* --------------------------------
   Database Errors
--------------------------------- */

/**
 * Convert a Supabase database/PostgREST
 * error into an application-level AppError.
 */
export function mapSupabaseDatabaseError(error) {
  if (!error) {
    return null;
  }

  /* -----------------------------
     Network / Timeout
  ------------------------------ */

  if (isNetworkError(error)) {
    if (isTimeoutError(error)) {
      return createAppError(
        "The database request took too long to complete.",
        504,
        ERROR_CODES.DATABASE_TIMEOUT
      );
    }

    return createAppError(
      "Unable to connect to the database service.",
      503,
      ERROR_CODES.DATABASE_ERROR
    );
  }

  /* -----------------------------
     Not Found
  ------------------------------ */

  if (error.code === "PGRST116") {
    return createAppError(
      "The requested resource was not found.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }

  /* -----------------------------
     Unique Violation
     PostgreSQL: 23505
  ------------------------------ */

  if (error.code === "23505") {
    return createAppError(
      "A record with the same information already exists.",
      409,
      ERROR_CODES.DUPLICATE_ENTRY
    );
  }

  /* -----------------------------
     Foreign Key Violation
     PostgreSQL: 23503
  ------------------------------ */

  if (error.code === "23503") {
    return createAppError(
      "This operation references a resource that does not exist.",
      400,
      ERROR_CODES.INVALID_OPERATION
    );
  }

  /* -----------------------------
     Not Null Violation
     PostgreSQL: 23502
  ------------------------------ */

  if (error.code === "23502") {
    return createAppError(
      "A required field is missing.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  /* -----------------------------
     Check Constraint Violation
     PostgreSQL: 23514
  ------------------------------ */

  if (error.code === "23514") {
    return createAppError(
      "The provided data violates a database rule.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  /* -----------------------------
     Generic Database Error
  ------------------------------ */

  return createAppError(
    "An error occurred while accessing the database.",
    503,
    ERROR_CODES.DATABASE_ERROR
  );
}

/* --------------------------------
   Generic Supabase Error
--------------------------------- */

/**
 * Automatically classify a Supabase
 * error when the source is not explicitly
 * known.
 */
export function mapSupabaseError(
  error,
  {
    type = "database",
  } = {}
) {
  if (!error) {
    return null;
  }

  if (type === "auth") {
    return mapSupabaseAuthError(error);
  }

  return mapSupabaseDatabaseError(error);
}
