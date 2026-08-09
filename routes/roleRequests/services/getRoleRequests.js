// services/roleRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { ROLES } from "../../../config/roles.js";

export async function getRoleRequests({
  churchId,
  memberId = null,
  status = "pending",
  includeMember = false,
}) {
  // -----------------------------------------
  // Validate church context
  // -----------------------------------------

  if (!churchId) {
    throw createAppError(
      "Failed to resolve active church.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  // -----------------------------------------
  // Select fields
  // -----------------------------------------

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

  // -----------------------------------------
  // Build conditions
  // -----------------------------------------

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

  // -----------------------------------------
  // Fetch requests
  // -----------------------------------------

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

      ORDER BY
        rr.role_requested_at DESC;
      `,
      values
    );

  // -----------------------------------------
  // Build frontend UI package
  // -----------------------------------------

  return rows.map((request) => {
    const roleConfig =
      ROLES[request.requested_role];

    return {
      id: request.id,

      member_id:
        request.member_id,

      role: {
        name:
          request.requested_role,

        label:
          roleConfig?.label ??
          request.requested_role,
      },

      status:
        request.role_request_status,

      requested_at:
        request.role_requested_at,

      member: {
        full_name:
          request.full_name,

        ...(includeMember && {
          email:
            request.email,
        }),
      },
    };
  });
}