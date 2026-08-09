import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

/**
 * Activate a department
 */
export async function activateDepartment({
  departmentId,
  churchId,
}) {
  if (!departmentId) {
    throw createAppError(
      "Department is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  if (!churchId) {
    throw createAppError(
      "Could not resolve active church.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  const { rows } = await pool.query(
    `
    UPDATE departments
    SET is_active = true
    WHERE id = $1
      AND church_id = $2
      AND is_system = false
    RETURNING
      id,
      name,
      code,
      type,
      is_system,
      is_active;
    `,
    [departmentId, churchId]
  );

  if (!rows.length) {
    throw createAppError(
      "Department not found or cannot be modified.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }

  return rows[0];
}
