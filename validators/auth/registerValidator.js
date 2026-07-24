import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../utils/phone.js";

import { toNameCase } from "../../utils/formatters.js";

export function validateRegisterInput({
  full_name,
  email,
  password,
  phone,
  date_of_birth,
  gender,
}) {
  if (!full_name?.trim()) {
    throw new Error("Full name is required.");
  }

  if (!email?.trim()) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 8) {
    throw new Error(
      "Password must be at least 8 characters."
    );
  }

  let normalizedPhone = null;

  if (phone) {
    if (!isValidKenyanPhone(phone)) {
      throw new Error(
        "Invalid Kenyan phone number."
      );
    }

    normalizedPhone =
      normalizeKenyanPhone(phone);
  }

  if (date_of_birth) {
    const dob = new Date(date_of_birth);

    if (Number.isNaN(dob.getTime())) {
      throw new Error(
        "Invalid date of birth."
      );
    }

    if (dob > new Date()) {
      throw new Error(
        "Date of birth cannot be in the future."
      );
    }
  }

  if (
    gender &&
    !["male", "female"].includes(
      gender.toLowerCase()
    )
  ) {
    throw new Error("Invalid gender.");
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