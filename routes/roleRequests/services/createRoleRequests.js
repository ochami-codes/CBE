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
    throw createAppError("Member is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!requestedRole) {
    throw createAppError("Requested role is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  requestedRole = normalizeRole(requestedRole);

  if (!isValidRole(requestedRole)) {
    throw createAppError("Invalid role.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!REQUESTABLE_ROLES.includes(requestedRole)) {
    throw createAppError("You cannot request this role.", 403, ERROR_CODES.FORBIDDEN);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
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

    if (existing.rowCount) {
      throw createAppError(
        "You already have a pending request for this role.",
        409,
        ERROR_CODES.CONFLICT
      );
    }

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