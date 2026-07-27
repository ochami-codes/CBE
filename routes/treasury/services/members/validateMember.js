import { pool } from "../../../../db.js";
import { createAppError } from "../../../../errors/AppError.js";
import { ERROR_CODES } from "../../../../errors/errorCodes.js";

export async function validateMember({
  churchId,
  memberId,
}) {

  const result =
    await pool.query(
      `
      SELECT
        id
      FROM members
      WHERE
        id = $1
        AND church_id = $2
      LIMIT 1
      `,
      [
        memberId,
        churchId,
      ]
    );

  if (result.rowCount === 0) {
    throw createAppError(
      "Member not found.",
      404,
      ERROR_CODES.MEMBER_NOT_FOUND
    );
  }
}