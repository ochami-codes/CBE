import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
export function validateResetPasswordInput({
  email,
}) {
  const normalizedEmail = email
    ?.trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw createAppError("Email is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw createAppError(
      "Invalid email address.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  return {
    email: normalizedEmail,
  };
}