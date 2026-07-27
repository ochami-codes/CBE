// services/department.service.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getDepartments({
  churchId,
}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      name,
      code,
      type
    FROM departments
    WHERE church_id = $1
    ORDER BY name;
    `,
    [churchId]
  );

  return {
    departments: rows,
  };
}