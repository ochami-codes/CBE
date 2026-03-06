import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";

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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        church_id,
        is_member
      `)
      .eq("id", authUser.id)
      .maybeSingle();

    if (!profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* ---------- Fetch Member Record ---------- */

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, role_name, active")
      .eq("profile_id", authUser.id)
      .eq("church_id", profile.church_id)
      .maybeSingle();

    /* ---------- Block Deactivated Accounts ---------- */

    if (member && member.active === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    const isMember = profile.is_member === true;

    req.user = {
      id: profile.id,       // auth identity
      member_id: member?.id ?? null, // church identity
      email: profile.email ?? authUser.email,
      full_name: profile.full_name || "Guest",
      role_name: isMember ? member?.role_name || "Member" : "Guest",
      church_id: profile.church_id ?? null,
      is_member: isMember,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
