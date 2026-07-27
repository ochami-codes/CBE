import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getMyProfile({profileId}) {
  if (!profileId) {
    throw createAppError("Profile is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      full_name,
      phone,
      email,
      active_church_id
    FROM profiles
    WHERE id = $1
    LIMIT 1;
    `,
    [profileId]
  );

  if (!rows.length) {
    throw createAppError("Profile not found.", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  return rows[0];
}