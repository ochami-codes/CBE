import { supabaseAdmin } from "../supabaseClient.js";

export async function loadMemberships(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        status,
        status_reason,
        suspended_at,
        church_id,
        member_roles (
          roles ( name )
        ),
        churches ( name )
      `)
      .eq("profile_id", req.profile.id);

    if (error) throw error;

    const memberships = data || [];

    /* --------------------------------
       RAW DATA ONLY
    -------------------------------- */
    req.memberships = memberships;

    next();
  } catch (err) {
    console.error("Membership load error:", err);

    return res.status(500).json({
      message: "Membership error",
    });
  }
}
