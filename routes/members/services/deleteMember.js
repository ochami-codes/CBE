import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function deleteMember({
  churchId,
  memberId,
  departmentId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM member_departments md
    USING members m

    WHERE
      md.member_id = m.id
      AND md.member_id = $1
      AND md.department_id = $2
      AND m.church_id = $3
    `,
    [
      memberId,
      departmentId,
      churchId,
    ]
  );

  if (!rowCount) {
    throw createAppError(
      "Member is not assigned to this department.",
      404,
      ERROR_CODES.MEMBER_NOT_FOUND
    );
  }

  return {
    message: "Member removed from department.",
  };
}