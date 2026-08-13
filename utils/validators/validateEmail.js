// utils/validators/auth/changeEmailValidator.js

import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";

/**
 * Validate and normalize email input for changeEmail service.
 * @param {Object} params
 * @param {string} params.email - The new email address to validate.
 * @returns {Object} - Normalized email object { email }
 * @throws {AppError} - If validation fails.
 */
export function validateEmail({ email }) {
  if (!email || typeof email !== "string") {
    throw createAppError(
      "Email address is required.",
      400,
      ERROR_CODES.INVALID_REQUEST
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Basic RFC 5322 compliant regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw createAppError(
      "Please provide a valid email address.",
      400,
      ERROR_CODES.INVALID_REQUEST
    );
  }

  return { email: normalizedEmail };
}
