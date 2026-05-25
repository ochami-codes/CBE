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
       ALL MEMBERSHIPS (raw)
    -------------------------------- */
    req.memberships = memberships;

    /* --------------------------------
       ACTIVE MEMBERSHIPS ONLY
    -------------------------------- */
    req.activeMemberships = memberships.filter(
      (m) => m.status === "active"
    );

    /* --------------------------------
       ACCESS-ELIGIBLE MEMBERSHIPS
       (important for dashboards)
    -------------------------------- */
    req.accessibleMemberships = memberships.filter(
      (m) => m.status === "active"
    );

    /* --------------------------------
       BLOCKED MEMBERSHIPS (audit / UI)
    -------------------------------- */
    req.suspendedMemberships = memberships.filter(
      (m) => m.status === "suspended"
    );

    req.inactiveMemberships = memberships.filter(
      (m) => m.status === "inactive"
    );

    next();
  } catch (err) {
    console.error("Membership load error:", err);
    return res.status(500).json({
      message: "Membership error",
    });
  }
}
