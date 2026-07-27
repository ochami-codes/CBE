// services/roleRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";

export async function reviewRoleRequest({
  requestId,
  reviewerProfileId,
  action,
}) {
  if (!requestId) {
    throw createAppError("Request is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!reviewerProfileId) {
    throw createAppError("Reviewer is required.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!["approved", "rejected"].includes(action)) {
    throw createAppError("Invalid action.", 400, ERROR_CODES.INVALID_OPERATION);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT *
      FROM role_requests
      WHERE id = $1
      FOR UPDATE;
      `,
      [requestId]
    );

    if (!rows.length) {
      throw createAppError("Request not found.", 404, ERROR_CODES.NOT_FOUND);
    }

    const request = rows[0];

    if (request.role_request_status !== "pending") {
      throw createAppError("Request has already been reviewed.", 409, ERROR_CODES.CONFLICT);
    }

    if (action === "approved") {
      const roleResult = await client.query(
        `
        SELECT id
        FROM roles
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1;
        `,
        [request.requested_role]
      );

      if (!roleResult.rowCount) {
        throw createAppError("Role not found.", 404, ERROR_CODES.NOT_FOUND);
      }

      await client.query(
        `
        INSERT INTO member_roles (
          member_id,
          role_id,
          department_id
        )
        VALUES ($1, $2, NULL)
        ON CONFLICT DO NOTHING;
        `,
        [
          request.member_id,
          roleResult.rows[0].id,
        ]
      );
    }

    await client.query(
      `
      UPDATE role_requests
      SET
        role_request_status = $1,
        role_reviewed_at = NOW(),
        role_reviewed_by = $2
      WHERE id = $3;
      `,
      [
        action,
        reviewerProfileId,
        requestId,
      ]
    );

    // Get profile to notify
    const { rows: members } = await client.query(
      `
      SELECT profile_id
      FROM members
      WHERE id = $1;
      `,
      [request.member_id]
    );

    if (members.length) {
      await notifyUser({
        userId: members[0].profile_id,
        churchId: request.church_id,
        type: "role_request",
        title:
          action === "approved"
            ? "Role Request Approved"
            : "Role Request Rejected",
        message:
          action === "approved"
            ? `Your request for the role "${request.requested_role}" has been approved.`
            : `Your request for the role "${request.requested_role}" has been rejected.`,
        relatedId: request.id,
        relatedType: "role_request",
      });
    }

    await client.query("COMMIT");

    return {
      ...request,
      role_request_status: action,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}