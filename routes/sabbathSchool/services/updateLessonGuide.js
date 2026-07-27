import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateLessonGuide({
  id,
  memberId,
  lessonType,
  year,
  quarter,
  status,
  remarks,
}) {
  // Ensure the updated values don't duplicate
  // another subscription for the same member
  const existing = await pool.query(
    `
    SELECT id
    FROM sabbath_school_lesson_guides
    WHERE
      member_id = $1
      AND year = $2
      AND quarter = $3
      AND id <> $4
    `,
    [
      memberId,
      year,
      quarter,
      id,
    ]
  );

  if (existing.rowCount > 0) {
    throw createAppError(
      "Member is already subscribed for this quarter.",
      409,
      ERROR_CODES.CONFLICT
    );
  }

  const { rows } = await pool.query(
    `
    UPDATE sabbath_school_lesson_guides

    SET
      member_id = $1,
      lesson_type = $2,
      year = $3,
      quarter = $4,
      status = $5,
      remarks = $6,
      updated_at = NOW()

    WHERE
      id = $7

    RETURNING
      id,
      member_id,
      lesson_type,
      year,
      quarter,
      status,
      remarks,
      updated_at
    `,
    [
      memberId,
      lessonType,
      year,
      quarter,
      status,
      remarks ?? null,
      id,
    ]
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