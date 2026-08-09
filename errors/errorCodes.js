// errors/errorCodes.js

export const ERROR_CODES = {
  // =========================
  // Authentication
  // =========================
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_CONFIRMED: "EMAIL_NOT_CONFIRMED",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",

  // =========================
  // Authorization
  // =========================
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // =========================
  // Validation
  // =========================
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // =========================
  // Resources
  // =========================
  NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",
  CHURCH_NOT_FOUND: "CHURCH_NOT_FOUND",
  DEPARTMENT_NOT_FOUND: "DEPARTMENT_NOT_FOUND",

  // =========================
  // Conflicts
  // =========================
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // =========================
  // Business Logic
  // =========================
  INVALID_OPERATION: "INVALID_OPERATION",
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",

  // =========================
  // Network & Connectivity
  // =========================
  NETWORK_ERROR: "NETWORK_ERROR",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  CONNECTION_REFUSED: "CONNECTION_REFUSED",
  CONNECTION_RESET: "CONNECTION_RESET",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // =========================
  // Timeout
  // =========================
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  DATABASE_TIMEOUT: "DATABASE_TIMEOUT",
  EXTERNAL_SERVICE_TIMEOUT: "EXTERNAL_SERVICE_TIMEOUT",

  // =========================
  // Server
  // =========================
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
};