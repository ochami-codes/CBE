// services/membershipRequestService.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";
import { bumpProfileVersionTx } from "../../../utils/profileVersion.js";

export async function reviewMembershipRequest({
  requestId,
  churchId,
  reviewedBy,
  action,
}) {
  if (!requestId) {
    throw createAppError("Request is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!churchId) {
    throw createAppError("Failed to resolve active church.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!reviewedBy) {
    throw createAppError("Failed to resolve reviewer.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
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
      FROM membership_requests
      WHERE id = $1
      FOR UPDATE;
      `,
      [requestId]
    );

    if (!rows.length) {
      throw createAppError("Membership request not found.", 404, ERROR_CODES.NOT_FOUND);
    }

    const request = rows[0];

    if (request.church_id !== churchId) {
      throw createAppError("Unauthorized church access.", 403, ERROR_CODES.FORBIDDEN);
    }

    if (request.source !== "user_request") {
      throw createAppError(
        "This is not a user membership request.",
        404,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (request.status !== "requested") {
      throw createAppError("Request has already been reviewed.", 409, ERROR_CODES.ALREADY_EXISTS);
    }

    await client.query(
      `
      UPDATE membership_requests
      SET
        status = $1,
        acted_by = $2,
        membership_responded_at = NOW()
      WHERE id = $3;
      `,
      [
        action,
        reviewedBy,
        requestId,
      ]
    );

    if (action === "approved") {
      const { rowCount } = await client.query(
        `
        SELECT 1
        FROM members
        WHERE profile_id = $1
          AND church_id = $2
        LIMIT 1;
        `,
        [
          request.profile_id,
          churchId,
        ]
      );

      if (!rowCount) {
        await client.query(
          `
          INSERT INTO members (
            profile_id,
            church_id,
            status
          )
          VALUES (
            $1,
            $2,
            'active'
          );
          `,
          [
            request.profile_id,
            churchId,
          ]
        );
      }
    }

    await notifyUser({
      userId: request.profile_id,
      churchId,
      type:
        action === "approved"
          ? "membership_approved"
          : "membership_rejected",
      title:
        action === "approved"
          ? "Membership Approved"
          : "Membership Rejected",
      message:
        action === "approved"
          ? "Your membership request has been approved."
          : "Your membership request has been rejected.",
      relatedId: request.id,
      relatedType: "membership_request",
      client,
    });

    await bumpProfileVersionTx(
      client,
      request.profile_id
    );

    await client.query("COMMIT");

    return {
      ...request,
      status: action,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}