// services/membershipRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyRoles } from "../../../services/notifications/notifyRoles.js";

export async function createMembershipRequest({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw createAppError("Profile is required.",400, ERROR_CODES.INVALID_CREDENTIALS );
  }

  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rowCount: existingRequests } = await client.query(
      `
      SELECT 1
      FROM membership_requests
      WHERE profile_id = $1
        AND church_id = $2
        AND status IN ('requested', 'invited')
      LIMIT 1;
      `,
      [profileId, churchId]
    );

    if (existingRequests) {
      throw new Error(
        "An active membership request already exists."
      );
    }

    const { rowCount: existingMember } = await client.query(
      `
      SELECT 1
      FROM members
      WHERE profile_id = $1
        AND church_id = $2
      LIMIT 1;
      `,
      [profileId, churchId]
    );

    if (existingMember) {
      throw createAppError(
        "You are already a member of this church.",
        409,
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    const { rows } = await client.query(
      `
      INSERT INTO membership_requests (
        profile_id,
        church_id,
        source,
        status,
        membership_requested_at
      )
      VALUES (
        $1,
        $2,
        'user_request',
        'requested',
        NOW()
      )
      RETURNING id;
      `,
      [profileId, churchId]
    );

    const request = rows[0];

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