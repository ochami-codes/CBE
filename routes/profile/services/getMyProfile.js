import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getMyProfile({profileId}) {
  if (!profileId) {
    throw createAppError("Failed to resolve profile", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
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