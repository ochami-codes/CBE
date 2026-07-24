// middleware/loadMembershipRequests.js

import { supabaseAdmin } from "../supabaseClient.js";

export async function loadMembershipRequests(
  req,
  res,
  next
) {
  try {
    const { data: requests, error } =
      await supabaseAdmin
        .from("membership_requests")
        .select(`
          id,
          church_id,
          status,
          membership_requested_at,
          churches (
            id,
            name
          )
        `)
        .eq("profile_id", req.profile.id);

    if (error) {
      throw error;
    }

    req.membershipRequests = (requests || [])
      .map((request) => ({
        id: request.id,
        church_id: request.church_id,
        status: request.status,
        membership_requested_at:
          request.membership_requested_at,
        church: request.churches
          ? {
              id: request.churches.id,
              name: request.churches.name,
            }
          : null,
      }));

    next();
  } catch (err) {
    console.error(
      "Membership requests load error:",
      err
    );

    return res.status(500).json({
      message: "Requests error",
    });
  }
}
