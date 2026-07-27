// services/memberService.js

import { pool } from "../../../db.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";

import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateMemberStatus({
  memberId,
  churchId,
  action,
  reason = null,
  performedBy,
}) {
  if (!memberId) {
    throw createAppError(
      "Member is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  if (!churchId) {
    throw createAppError(
      "Church is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  if (!["suspend", "activate"].includes(action)) {
    throw createAppError(
      "Invalid action.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  if (performedBy === memberId) {
    throw createAppError(
      "You cannot modify your own status.",
      403,
      ERROR_CODES.OPERATION_NOT_ALLOWED
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT
        id,
        profile_id,
        status
      FROM members
      WHERE id = $1
        AND church_id = $2
      FOR UPDATE;
      `,
      [memberId, churchId]
    );

    if (!rows.length) {
      throw createAppError(
        "Member not found.",
        404,
        ERROR_CODES.MEMBER_NOT_FOUND
      );
    }

    const member = rows[0];

    if (
      action === "suspend" &&
      member.status === "suspended"
    ) {
      throw createAppError(
        "Member is already suspended.",
        409,
        ERROR_CODES.INVALID_OPERATION
      );
    }

    if (
      action === "activate" &&
      member.status !== "suspended"
    ) {
      throw createAppError(
        "Member is not suspended.",
        409,
        ERROR_CODES.INVALID_OPERATION
      );
    }

    const nextStatus =
      action === "suspend"
        ? "suspended"
        : "active";

    await client.query(
      `
      UPDATE members
      SET
        status = $1,
        status_reason = $2,
        suspended_at = $3
      WHERE id = $4;
      `,
      [
        nextStatus,
        action === "suspend"
          ? reason ?? "Administrative suspension"
          : null,
        action === "suspend"
          ? new Date()
          : null,
        memberId,
      ]
    );

    await notifyUser({
      userId: member.profile_id,
      churchId,
      type: "member_status",
      title:
        action === "suspend"
          ? "Membership Suspended"
          : "Membership Reactivated",
      message:
        action === "suspend"
          ? `Your membership has been suspended.${
              reason ? ` Reason: ${reason}` : ""
            }`
          : "Your membership has been reactivated.",
      relatedId: memberId,
      relatedType: "member",
    });

    await client.query("COMMIT");

    return {
      memberId,
      status: nextStatus,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}