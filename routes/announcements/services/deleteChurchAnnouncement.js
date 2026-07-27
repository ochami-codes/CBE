import { pool } from "../../../db.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { createAppError } from "../../../errors/AppError.js";

export async function deleteChurchAnnouncement({
  churchId,
  announcementId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM announcements
    WHERE
      id = $1
      AND church_id = $2
      AND department_id IS NULL
    `,
    [
      announcementId,
      churchId,
    ]
  );

  if (rowCount === 0) {
    throw createAppError(
      "Church announcement not found.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }
}