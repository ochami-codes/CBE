import { pool } from "../../../db.js";
import {
  normalizeRole,
  isValidRole,
  REQUESTABLE_ROLES,
} from "../../../config/roles.js";
import { notifyRoles } from "../../../services/notifications/notifyRoles.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function createRoleRequests({
  memberId,
  churchId,
  requestedRole,
}) {
  if (!memberId) {
    throw createAppError(
      "Failed to resolve member.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  if (!churchId) {
    throw createAppError(
      "Failed to resolve active church.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  if (!requestedRole) {
    throw createAppError(
      "Requested role is required.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  requestedRole = normalizeRole(requestedRole);

  if (!isValidRole(requestedRole)) {
    throw createAppError(
      "Invalid role.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  if (!REQUESTABLE_ROLES.includes(requestedRole)) {
    throw createAppError(
      "You cannot request this role.",
      403,
      ERROR_CODES.FORBIDDEN
    );
  }
   
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -----------------------------------------
       Check if member already has this role
    ----------------------------------------- */

    const existingRole = await client.query(
      `
      SELECT 1
      FROM member_roles mr
      JOIN roles r
        ON r.id = mr.role_id
      WHERE mr.member_id = $1
        AND r.name = $2
      LIMIT 1;
      `,
      [memberId, requestedRole]
    );

    if (existingRole.rowCount) {
      throw createAppError(
        "You already have this role.",
        409,
        ERROR_CODES.CONFLICT
      );
    }
     
   // BLOCK ADMIN Requests

const adminRole = await client.query(
  `
  SELECT 1
  FROM member_roles mr
  JOIN roles r
    ON r.id = mr.role_id
  WHERE mr.member_id = $1
    AND LOWER(r.name) = 'admin'
  LIMIT 1
  `,
  [memberId]
);

if (adminRole.rows.length > 0) {
  throw createAppError(
    "Church administrators cannot request for roles.",
    403,
    ERROR_CODES.FORBIDDEN
  );
}
    /* -----------------------------------------
       Check for existing pending request
    ----------------------------------------- */

    const existingRequest = await client.query(
      `
      SELECT 1
      FROM role_requests
      WHERE member_id = $1
        AND church_id = $2
        AND requested_role = $3
        AND role_request_status = 'pending'
      LIMIT 1;
      `,
      [memberId, churchId, requestedRole]
    );

    if (existingRequest.rowCount) {
      throw createAppError(
        "You already have a pending request for this role.",
        409,
        ERROR_CODES.CONFLICT
      );
    }

    /* -----------------------------------------
       Create role request
    ----------------------------------------- */

    const { rows } = await client.query(
      `
      INSERT INTO role_requests (
        member_id,
        requested_role,
        church_id,
        role_request_status,
        role_requested_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'pending',
        NOW()
      )
      RETURNING *;
      `,
      [memberId, requestedRole, churchId]
    );

    const request = rows[0];

    /* -----------------------------------------
       Notify administrators
    ----------------------------------------- */

    await notifyRoles({
      churchId,
      roles: ["admin"],
      type: "role_request",
      title: "New Role Request",
      message: `A member requested the role ${requestedRole}.`,
      relatedId: request.id,
      relatedType: "role_request",
    });

    await client.query("COMMIT");

    return request;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}