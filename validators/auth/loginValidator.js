import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";

export function validateLoginInput({
  email,
  password,
}) {
  if (!email?.trim()) {
    throw createAppError("Email is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!password) {
    throw createAppError("Password is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  return {
    email: email.trim().toLowerCase(),
    password,
  };
}