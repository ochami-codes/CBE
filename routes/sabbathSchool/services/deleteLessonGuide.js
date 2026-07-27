import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function deleteLessonGuide(
  id
) {
  const { rows } = await pool.query(
    `
    DELETE FROM
      sabbath_school_lesson_guides

    WHERE
      id = $1

    RETURNING
      id
    `,
    [id]
  );

  if (rows.length === 0) {
    throw createAppError(
      "Lesson guide subscription not found.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }

  return rows[0];
}