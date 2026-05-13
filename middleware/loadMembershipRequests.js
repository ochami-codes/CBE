// middleware/loadMembershipRequests.js
import { supabaseAdmin } from "../supabaseClient.js";

export async function loadMembershipRequests(req, res, next) {
  try {
    const { data: requests } = await supabaseAdmin
      .from("membership_requests")
      .select(`
        id,
        church_id,
        status,
        membership_requested_at,
        churches ( name )
      `)
      .eq("profile_id", req.profile.id);

    req.membershipRequests = requests || [];
    next();
  } catch (err) {
    return res.status(500).json({ message: "Requests error" });
  }
}
