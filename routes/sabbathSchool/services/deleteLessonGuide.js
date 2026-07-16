import { pool } from "../../../db.js";

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
    throw new Error(
      "Lesson guide subscription not found."
    );
  }

  return rows[0];
}