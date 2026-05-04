import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";
import { normalizeRole, getUserPermissions } from "../config/roles.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    /* ---------- Verify Token ---------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    /* ---------- Fetch Profile ---------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        is_member
      `)
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* ---------- Fetch ALL memberships ---------- */
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        status,
        church_id,
        member_roles (
          roles (
            name
          )
        )
      `)
      .eq("profile_id", profile.id);

    if (memberError) {
      return res.status(500).json({ message: "Failed to fetch memberships" });
    }

    /* ---------- Filter active memberships ---------- */
    const activeMemberships =
      memberships?.filter((m) => m.status === "active") || [];

    /* ---------- Role resolution (global across churches) ---------- */
    const roleSet = new Set();

    activeMemberships.forEach((m) => {
      const names =
        m.member_roles?.map((r) => r.roles?.name) || [];

      names.forEach((name) => {
        roleSet.add(normalizeRole(name));
      });
    });

    const roles =
      roleSet.size > 0
        ? [...roleSet]
        : profile.is_member
        ? ["member"]
        : ["guest"];

    const permissions = getUserPermissions(roles);

    /* ---------- Active Church (IMPORTANT CONCEPT) ---------- */
    const activeMembership = activeMemberships[0] || null;

    /* ---------- Attach user ---------- */
    req.user = {
      id: profile.id,
      auth_user_id: authUser.id,
      email: profile.email ?? authUser.email,
      full_name: profile.full_name || "Guest",

      roles,
      primary_role: roles[0],
      permissions,

      memberships: memberships || [],
      active_church_id: activeMembership?.church_id || null,

      is_member: (memberships?.length || 0) > 0,
      email_confirmed_at: authUser.email_confirmed_at,
    };

    next();
  } catch (err) {
    console.error("🔥 Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
