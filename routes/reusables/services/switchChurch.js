// services/church.service.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function switchActiveChurch({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw createAppError("Failed to resolve user.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Ensure the church exists
  const { rows: churchRows } = await pool.query(
    `
    SELECT id
    FROM churches
    WHERE id = $1;
    `,
    [churchId]
  );

  if (!churchRows.length) {
    throw createAppError("Church not found.", 404, ERROR_CODES.CHURCH_NOT_FOUND);
  }

  await pool.query(
    `
    UPDATE profiles
    SET active_church_id = $1
    WHERE id = $2;
    `,
    [churchId, profileId]
  );

  return {
    message: "Active church updated successfully.",
  };
}