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
       2️⃣ Resolve identity from member_full (optional)
    ------------------------------------------------ */
    const { data: member } = await supabaseAdmin
      .from("member_full")
      .select(`
        id,
        full_name,
        email,
        role_name,
        active,
        church_id
      `)
      .eq("id", authUser.id)
      .maybeSingle();

    /* ------------------------------------------------
       3️⃣ Block deactivated members
    ------------------------------------------------ */
    if (member && member.active === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    /* ------------------------------------------------
       4️⃣ Attach normalized user context
    ------------------------------------------------ */
    req.user = {
      id: authUser.id, // Supabase UID = profile_id
      email: member?.email ?? authUser.email,
      full_name:
        member?.full_name ||
        authUser.user_metadata?.full_name ||
        "Guest",
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
