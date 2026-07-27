import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";

export function validateChangePasswordInput(input = {}) {
  let { newPassword } = input;

  // Support accidental nested payloads
  if (
    typeof newPassword === "object" &&
    newPassword !== null
  ) {
    newPassword =
      newPassword.password ??
      newPassword.newPassword ??
      "";
  }

  newPassword = String(newPassword ?? "").trim();

  if (!newPassword) {
    throw createAppError(
      "New password is required.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  if (newPassword.length < 6) {
    throw createAppError(
      "New password must be at least 6 characters long.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  return {
    newPassword,
  };
}