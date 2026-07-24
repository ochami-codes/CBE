// services/roleRequestService.js

import { pool } from "../../../db.js";

export async function getPendingRoleRequestCount(churchId) {
  if (!churchId) {
    throw new Error("Church is required.");
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