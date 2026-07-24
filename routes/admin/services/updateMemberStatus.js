// services/memberService.js

import { pool } from "../../../db.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";

export async function updateMemberStatus({
  memberId,
  churchId,
  action,
  reason = null,
  performedBy,
}) {
  if (!memberId) {
    throw new Error("Member is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  if (!["suspend", "activate"].includes(action)) {
    throw new Error("Invalid action.");
  }

  if (performedBy === memberId) {
    throw new Error("You cannot modify your own status.");
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
      throw new Error("Member not found.");
    }

    const member = rows[0];

    if (
      action === "suspend" &&
      member.status === "suspended"
    ) {
      throw new Error("Member is already suspended.");
    }

    if (
      action === "activate" &&
      member.status !== "suspended"
    ) {
      throw new Error("Member is not suspended.");
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
          ? `Your membership has been suspended.${reason ? ` Reason: ${reason}` : ""}`
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