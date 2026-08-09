// services/department.service.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getDepartments({
  churchId,
}) {
  if (!churchId) {
    throw createAppError(
      "Failed to resolve active church.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      name,
      code,
      is_active,
      is_system
    FROM departments
    WHERE church_id = $1
    ORDER BY is_system DESC, name ASC;
    `,
    [churchId]
  );

  return {
    departments: rows,
  };
}