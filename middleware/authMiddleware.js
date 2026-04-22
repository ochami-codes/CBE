import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";
import { normalizeRole, getUserPermissions } from "../config/roles.js";

export async function authMiddleware(req, res, next) {
  try {
    console.log("=== Auth middleware hit ===");

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("❌ Missing or invalid authorization header");
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔹 Token received:", token?.slice(0, 10) + "...");

    /* ---------- Verify Token ---------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      console.warn("❌ Invalid or expired token", authError);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    console.log("🔹 Authenticated user:", authUser.id, authUser.email);

    /* ---------- Fetch Profile ---------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        church_id,
        is_member
      `)
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
      return res.status(500).json({ message: "Failed to fetch profile" });
    }

    if (!profile) {
      console.warn("❌ Profile not found for auth_user_id:", authUser.id);
      return res.status(401).json({ message: "Profile not found" });
    }

    console.log("🔹 Profile found:", profile.id, profile.full_name);

    /* ---------- Fetch Member Record ---------- */
const { data: memberData, error: memberError } = await supabaseAdmin
  .from("members")
  .select(`
    id,
    status,
    member_roles (
      roles (
        name
      )
    )
  `)
  .eq("profile_id", profile.id)
  .eq("church_id", profile.church_id)
  .maybeSingle();

if (memberError) {
  console.error("❌ Member fetch error:", memberError);
}

if (memberData) {
  if (memberData.status !== "active") {
    return res.status(403).json({
      message: "Account is not active",
    });
  }
}
    const isMember = !!profile.is_member;

    /* ---------- Role + Permissions ---------- */
    const roles = memberData?.member_roles?.map(
  (mr) => mr.roles.name
) || [];
const normalizedRoles = roles.length
  ? roles.map(normalizeRole)
  : ["member"];
    const permissions = getUserPermissions(normalizedRoles);
    /* ---------- Attach user to request ---------- */
    req.user = {
      id: profile.id,
      member_id: member?.id ?? null,
      email: profile.email ?? authUser.email,
      full_name: profile.full_name || "Guest",
      roles: normalizedRoles,
primary_role: normalizedRoles[0], // optional
      church_id: profile.church_id ?? null,
      is_member: isMember,
      email_confirmed_at: authUser.email_confirmed_at,
      // 🔥 NEW: permissions attached automatically
      permissions,
    };

    console.log("✅ Middleware passed, req.user set:", req.user);

    next();
  } catch (err) {
    console.error("🔥 Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
