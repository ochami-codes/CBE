// services/membershipRequestService.js

import { pool } from "../../../db.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";
import { bumpProfileVersionTx } from "../../../utils/profileVersion.js";

export async function reviewMembershipRequest({
  requestId,
  churchId,
  reviewedBy,
  action,
}) {
  if (!requestId) {
    throw new Error("Request is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  if (!reviewedBy) {
    throw new Error("Reviewer is required.");
  }

  if (!["approved", "rejected"].includes(action)) {
    throw new Error("Invalid action.");
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
      throw new Error("Membership request not found.");
    }

    const request = rows[0];

    if (request.church_id !== churchId) {
      throw new Error("Unauthorized church access.");
    }

    if (request.source !== "user_request") {
      throw new Error(
        "This is not a user membership request."
      );
    }

    if (request.status !== "requested") {
      throw new Error("Request has already been reviewed.");
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