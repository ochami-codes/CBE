// middleware/loadMemberships.js
import { supabaseAdmin } from "../supabaseClient.js";

export async function loadMemberships(req, res, next) {
  try {
    const { data: memberships } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        status,
        church_id,
        member_roles (
          roles ( name )
        ),
        churches ( name )
      `)
      .eq("profile_id", req.profile.id);

    req.memberships = memberships || [];
    next();
  } catch (err) {
    return res.status(500).json({ message: "Membership error" });
  }
}
