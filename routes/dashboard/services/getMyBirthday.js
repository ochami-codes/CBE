import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getMyBirthday({profileId}) {
  if (!profileId) {
    throw createAppError("Profile is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      full_name,
      date_of_birth
    FROM profiles
    WHERE id = $1
    LIMIT 1;
    `,
    [profileId]
  );

  if (!rows.length) {
    throw createAppError("Profile not found.", 404, ERROR_CODES.NOT_FOUND);
  }

  const profile = rows[0];

  const dob = profile.date_of_birth
    ? new Date(profile.date_of_birth)
    : null;

  const today = new Date();

  const isBirthday =
    dob &&
    dob.getUTCDate() === today.getUTCDate() &&
    dob.getUTCMonth() === today.getUTCMonth();

  return {
    birthday: {
      birthday: profile.date_of_birth,
      full_name: profile.full_name,
    },
    isBirthday,
  };
}