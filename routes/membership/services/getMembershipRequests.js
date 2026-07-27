// services/membershipRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getMembershipRequests({
  churchId,
  status = "requested",
  source = "user_request",
}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const values = [churchId];
  const conditions = ["mr.church_id = $1"];
  let index = 2;

  if (source) {
    conditions.push(`mr.source = $${index++}`);
    values.push(source);
  }

  if (status) {
    conditions.push(`mr.status = $${index++}`);
    values.push(status);
  }

  const { rows } = await pool.query(
    `
    SELECT
      mr.id AS membership_request_id,
      p.id AS profile_id,
      p.full_name,
      p.email,
      mr.status AS membership_status,
      mr.source AS membership_source,
      mr.membership_requested_at
    FROM membership_requests mr
    JOIN profiles p
      ON p.id = mr.profile_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY mr.membership_requested_at DESC;
    `,
    values
  );

  return rows;
}