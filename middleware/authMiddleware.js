import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";

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

    /* ---------- Fetch Profile (supports converted users) ---------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        church_id,
        is_member
      `)
      .eq("auth_user_id", authUser.id) // ✅ always use auth_user_id
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
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, role_name, active")
      .eq("profile_id", profile.id)      // ✅ use real profile.id
      .eq("church_id", profile.church_id)
      .maybeSingle();

    if (memberError) {
      console.error("❌ Member fetch error:", memberError);
    }

    if (member && member.active === false) {
      console.warn("❌ Account deactivated for profile:", profile.id);
      return res.status(403).json({ message: "Account deactivated" });
    }

    const isMember = !!profile.is_member;

    /* ---------- Attach user to request ---------- */
    req.user = {
      id: profile.id,                     // profile ID is identity
      member_id: member?.id ?? null,      // church membership ID
      email: profile.email ?? authUser.email,
      full_name: profile.full_name || "Guest",
      role_name: isMember ? member?.role_name || "Member" : "Guest",
      church_id: profile.church_id ?? null,
      is_member: isMember,
    };

    console.log("✅ Middleware passed, req.user set:", req.user);

    next();
  } catch (err) {
    console.error("🔥 Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
