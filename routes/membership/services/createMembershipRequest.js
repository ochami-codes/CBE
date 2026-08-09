// services/membershipRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyRoles } from "../../../services/notifications/notifyRoles.js";

export async function createMembershipRequest({ profileId, churchId }) {
  if (!profileId) {
    throw createAppError(
      "Failed to resolve authenticated profile.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  if (!churchId) {
    throw createAppError(
      "Church is required.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* --------------------------------
       Check if already a member
    -------------------------------- */
    const { rowCount: isMember } = await client.query(
      `
      SELECT 1
      FROM members
      WHERE profile_id = $1
        AND church_id = $2
      LIMIT 1;
      `,
      [profileId, churchId]
    );

    if (isMember) {
      throw createAppError(
        "You are already a member of this church.",
        409,
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    /* --------------------------------
       Check existing request
    -------------------------------- */
    const { rows: existingRequests } = await client.query(
      `
      SELECT id, status
      FROM membership_requests
      WHERE profile_id = $1
        AND church_id = $2
      LIMIT 1;
      `,
      [profileId, churchId]
    );

    let request;

    if (existingRequests.length) {
      const existing = existingRequests[0];

      if (["requested", "invited"].includes(existing.status)) {
        throw createAppError(
          "An active membership request already exists.",
          409,
          ERROR_CODES.ALREADY_EXISTS
        );
      }

      if (existing.status === "rejected") {
        const { rows: updated } = await client.query(
          `
          UPDATE membership_requests
          SET
            status = 'requested',
            source = 'user_request',
            membership_requested_at = NOW()
          WHERE id = $1
          RETURNING id;
          `,
          [existing.id]
        );

        request = updated[0];
      }
    }

    /* --------------------------------
       Create new request if none
    -------------------------------- */
    if (!request) {
      const { rows: inserted } = await client.query(
        `
        INSERT INTO membership_requests (
          profile_id,
          church_id,
          source,
          status,
          membership_requested_at
        )
        VALUES ($1, $2, 'user_request', 'requested', NOW())
        RETURNING id;
        `,
        [profileId, churchId]
      );

      request = inserted[0];
    }

    /* --------------------------------
       Notify admins
    -------------------------------- */
    await notifyRoles({
      client,
      churchId,
      roles: ["admin"],
      type: "membership_request",
      title: "New Membership Request",
      message: "A new membership request has been submitted.",
      relatedId: request.id,
      relatedType: "membership_request",
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
