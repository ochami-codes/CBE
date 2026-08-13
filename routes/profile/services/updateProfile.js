// services/profile/updateMyProfile.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateMyProfile({
  profileId,
  fullName,
  phone,
}) {
  if (!profileId) {
    throw createAppError(
      "Failed to resolve profile.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  if (!fullName?.trim()) {
    throw createAppError(
      "Full name is required.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  const name = fullName.trim();
  const normalizedPhone =
    phone?.trim() || null;

  const { rows } = await pool.query(
    `
    UPDATE profiles
    SET
      full_name = $1,
      phone = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING
      id,
      full_name,
      phone,
      email,
      active_church_id,
      updated_at;
    `,
    [
      name,
      normalizedPhone,
      profileId,
    ]
  );

  if (!rows.length) {
    throw createAppError(
      "Profile not found.",
      404,
      ERROR_CODES.USER_NOT_FOUND
    );
  }

  return rows[0];
}