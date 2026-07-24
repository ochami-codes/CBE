// services/membershipRequestService.js

import { pool } from "../../../db.js";

export async function getMyMembershipRequest({profileId}) {
  if (!profileId) {
    throw new Error("Profile is required.");
  }

  const { rows } = await pool.query(
    `
    SELECT
      mr.id,
      mr.church_id,
      mr.source,
      mr.status,
      mr.membership_requested_at,
      mr.membership_responded_at
    FROM membership_requests mr
    WHERE mr.profile_id = $1
    ORDER BY mr.membership_requested_at DESC
    LIMIT 1;
    `,
    [profileId]
  );

  const request = rows[0] ?? null;

  return {
    membership: request,
    membership_status: request?.status ?? null,
    has_active_request:
      request != null &&
      ["requested", "invited"].includes(request.status),
  };
}