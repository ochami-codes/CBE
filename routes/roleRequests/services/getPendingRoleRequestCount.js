// services/roleRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getPendingRoleRequestCount(churchId) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const { rows } = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM role_requests
    WHERE church_id = $1
      AND role_request_status = 'pending';
    `,
    [churchId]
  );

  return rows[0].count;
}