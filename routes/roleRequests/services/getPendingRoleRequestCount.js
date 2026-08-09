// services/roleRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getPendingRoleRequestCount(churchId) {
  if (!churchId) {
    throw createAppError("Failed to resolve active church", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
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