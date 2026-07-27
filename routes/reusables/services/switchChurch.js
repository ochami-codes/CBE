// services/church.service.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function switchActiveChurch({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw createAppError("User is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
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