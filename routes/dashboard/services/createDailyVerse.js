import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function createDailyVerse({
  reference,
  text,
  verseDate,
}) {
  if (!reference) {
    throw createAppError("Reference is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!text) {
    throw createAppError("Verse text is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!verseDate) {
    throw createAppError("Verse date is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  const { rows } = await pool.query(
    `
    INSERT INTO daily_verses (
      reference,
      text,
      verse_date
    )
    VALUES (
      $1,
      $2,
      $3
    )
    RETURNING
      id,
      reference,
      text,
      verse_date;
    `,
    [
      reference.trim(),
      text.trim(),
      verseDate,
    ]
  );

  return rows[0];
}