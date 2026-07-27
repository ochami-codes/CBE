import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function createConference({
  name,
  conferenceCode,
}) {
  if (!name?.trim()) {
    throw createAppError("Conference name is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!conferenceCode?.trim()) {
    throw createAppError("Conference code is required.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  const { rows } = await pool.query(
    `
    INSERT INTO conferences (
      name,
      conference_code
    )
    VALUES ($1, $2)
    RETURNING
      id,
      name,
      conference_code;
    `,
    [
      name.trim(),
      conferenceCode.trim().toUpperCase(),
    ]
  );

  return rows[0];
}