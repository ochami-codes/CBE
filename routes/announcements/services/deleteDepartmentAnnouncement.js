import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function deleteDepartmentAnnouncement({
  churchId,
  departmentId,
  announcementId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM announcements
    WHERE
      id = $1
      AND church_id = $2
      AND department_id = $3
    `,
    [
      announcementId,
      churchId,
      departmentId,
    ]
  );

  if (rowCount === 0) {
    throw createAppError(
      "Department announcement not found.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }
}