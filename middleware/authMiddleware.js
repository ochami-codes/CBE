// middleware/authMiddleware.js
import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    /* ------------------------------------------------
       1️⃣ Verify Supabase access token
    ------------------------------------------------ */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    /* ------------------------------------------------
       2️⃣ Fetch profile (SOURCE OF TRUTH)
    ------------------------------------------------ */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        church_id,
        is_member,
        members:members!members_id_fkey(role_name, active)
      `)
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* ------------------------------------------------
       3️⃣ Block deactivated members
    ------------------------------------------------ */
    if (profile.members?.active === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    /* ------------------------------------------------
       4️⃣ Attach normalized user context
    ------------------------------------------------ */
    const isMember = profile.is_member === true;

    req.user = {
      id: profile.id,
      email: profile.email ?? authUser.email,
      full_name:
        profile.full_name ||
        authUser.user_metadata?.full_name ||
        "Guest",
      role_name: isMember
        ? profile.members?.role_name || "Member"
        : "Guest",
      church_id: profile.church_id || null,
      is_member: isMember,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
