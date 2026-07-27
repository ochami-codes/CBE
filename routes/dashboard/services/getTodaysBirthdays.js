import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getTodaysBirthdays({churchId}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const { rows } = await pool.query(
    `
    SELECT
      p.id,
      p.full_name,
      p.date_of_birth
    FROM members m
    JOIN profiles p
      ON p.id = m.profile_id
    WHERE m.church_id = $1
      AND m.status = 'active'
      AND EXTRACT(MONTH FROM p.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM p.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
    ORDER BY p.full_name;
    `,
    [churchId]
  );

  return rows;
}