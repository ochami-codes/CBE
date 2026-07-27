import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function createDepartment({
  churchId,
  name,
  code,
  type = null,
}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!name?.trim()) {
    throw createAppError("Department name is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!code?.trim()) {
    throw createAppError("Department code is required.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  const { rows } = await pool.query(
    `
    INSERT INTO departments (
      church_id,
      name,
      code,
      type
    )
    VALUES (
      $1,
      $2,
      $3,
      $4
    )
    RETURNING
      id,
      church_id,
      name,
      code,
      type;
    `,
    [
      churchId,
      name.trim(),
      code.trim().toUpperCase(),
      type?.trim() ?? null,
    ]
  );

  return rows[0];
}