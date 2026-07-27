import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../utils/phone.js";

import { toNameCase } from "../../utils/formatters.js";
import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";

export function validateRegisterInput({
  full_name,
  email,
  password,
  phone,
  date_of_birth,
  gender,
}) {
  if (!full_name?.trim()) {
    throw createAppError("Full name is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!email?.trim()) {
    throw createAppError("Email is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!password) {
    throw createAppError("Password is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (password.length < 8) {
    throw createAppError(
      "Password must be at least 8 characters.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  let normalizedPhone = null;

  if (phone) {
    if (!isValidKenyanPhone(phone)) {
      throw createAppError(
        "Invalid Kenyan phone number.",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    normalizedPhone =
      normalizeKenyanPhone(phone);
  }

  if (date_of_birth) {
    const dob = new Date(date_of_birth);

    if (Number.isNaN(dob.getTime())) {
      throw createAppError(
        "Invalid date of birth.",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (dob > new Date()) {
      throw createAppError(
        "Date of birth cannot be in the future.",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  if (
    gender &&
    !["male", "female"].includes(
      gender.toLowerCase()
    )
  ) {
    throw createAppError("Invalid gender.",400, ERROR_CODES.INVALID_INPUT);
  }

  return {
    full_name: toNameCase(full_name),
    email: email.trim().toLowerCase(),
    password,
    phone: normalizedPhone,
    date_of_birth: date_of_birth || null,
    gender: gender
      ? gender.toLowerCase()
      : null,
  };
}