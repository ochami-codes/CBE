// services/roleRequestService.js
import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getRoleRequests({
  churchId,
  memberId = null,
  status = "pending",
  includeMember = false,
}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const select = [
    "rr.id",
    "rr.member_id",
    "rr.requested_role",
    "rr.role_request_status",
    "rr.role_requested_at",
    "p.full_name",
  ];

  if (includeMember) {
    select.push("p.email");
  }

  const conditions = [
    "rr.church_id = $1",
    "rr.role_request_status = $2",
  ];

  const values = [
    churchId,
    status,
  ];

  let index = 3;

  if (memberId) {
    conditions.push(
      `rr.member_id = $${index++}`
    );

    values.push(memberId);
  }

  const { rows } =
    await pool.query(
      `
      SELECT
        ${select.join(",\n        ")}
      FROM role_requests rr
      LEFT JOIN members m
        ON m.id = rr.member_id
      LEFT JOIN profiles p
        ON p.id = m.profile_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY rr.role_requested_at DESC;
      `,
      values
    );

  return rows;
}