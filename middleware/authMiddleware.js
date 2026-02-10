// middleware/authMiddleware.js
import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    /* ---------------------------------
       1️⃣ Verify Supabase token
    ---------------------------------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    /* ---------------------------------
       2️⃣ Load profile (source of truth)
    ---------------------------------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* ---------------------------------
       3️⃣ Optional membership (VIEW)
    ---------------------------------- */
    const { data: member } = await supabaseAdmin
      .from("member_full")
      .select("role_name, active, church_id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (member?.active === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    /* ---------------------------------
       4️⃣ Attach normalized user
    ---------------------------------- */
    req.user = {
      id: profile.id,                 // ✅ profile_id
      authUserId: authUser.id,        // Supabase UID
      email: profile.email,
      full_name: profile.full_name,
      role_name: member?.role_name || "Guest",
      church_id: member?.church_id || null,
      is_member: !!member,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
