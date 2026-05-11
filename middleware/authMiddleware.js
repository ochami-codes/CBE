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
const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

console.log("SUPABASE ERROR:", authError);
console.log("SUPABASE USER:", authUser);

if (authError ||!authUser) {
  return res.status(401).json({ message: "Invalid or expired token" });
}

    /* ---------- Fetch Profile ---------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        auth_user_id,
        full_name,
        phone,
        email,
        active_church_id
      `)
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* ---------- Fetch memberships ---------- */
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
        ),
        churches (
          name
        )
      `)
      .eq("profile_id", profile.id);

    if (memberError) {
      return res.status(500).json({ message: "Failed to fetch memberships" });
    }

    const allMemberships = memberships || [];

    /* ---------- Active memberships only ---------- */
    const activeMemberships = allMemberships.filter(
      (m) => m.status === "active"
    );

    /* ---------- Role resolution ---------- */
    const roleSet = new Set();

    activeMemberships.forEach((m) => {
      const names = m.member_roles?.map((r) => r.roles?.name) || [];
      names.forEach((name) => roleSet.add(normalizeRole(name)));
    });

    const roles =
      roleSet.size > 0 ? [...roleSet] : ["guest"];

    const permissions = getUserPermissions(roles);

    /* ---------- ACTIVE CHURCH (correct logic) ---------- */
const activeMembership =
  activeMemberships.find(
    (m) => m.church_id === profile.active_church_id
  ) || activeMemberships[0] || null;

const resolvedActiveChurchId =
  activeMembership?.church_id || null;

const activeChurch = activeMembership
  ? {
      id: activeMembership.church_id,
      name: activeMembership.churches?.name,
    }
  : null;
 const currentChurchMembership =
  allMemberships.find(
    (m) => m.church_id === resolvedActiveChurchId
  ) || null;

  const { data: requests } = await supabaseAdmin
    .from("membership_requests")
    .select("membership_request_status")
    .eq("profile_id", profile.id)
    .order("membership_requested_at", {
      ascending: false,
    })
    .limit(1);

  const latestRequest = requests?.[0] ?? null;
    /* ---------- Attach user ---------- */
   req.user = {
  id: profile.id,
  auth_user_id: authUser.id,

  email: profile.email || authUser.email,
  phone: profile.phone,

  full_name:
    profile.full_name ||
    authUser.email?.split("@")[0] ||
    "Guest",

  roles,
  primary_role: roles[0],
  permissions,

  memberships: allMemberships.map((m) => ({
    id: m.id,
    church_id: m.church_id,
    church_name: m.churches?.name,
    status: m.status,
    roles:
      m.member_roles?.map(
        (r) => r.roles?.name
      ) || [],
  })),

  active_church_id: resolvedActiveChurchId,

  active_church: activeChurch,

  active_membership_status:
    currentChurchMembership?.status || "guest",

  is_member:
    currentChurchMembership?.status ===
    "active",

  membership_status:
    activeMemberships.length > 0
      ? "approved"
      : latestRequest?.membership_request_status ||
        "none",

  email_confirmed_at:
    authUser.email_confirmed_at,
};

    next();
  } catch (err) {
    console.error("🔥 Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
