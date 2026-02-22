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
       2️⃣ Fetch profile (identity)
    ---------------------------------- */
    const { data: profile, error: profileError } =
      await supabaseAdmin
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

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* ---------------------------------
       3️⃣ Fetch member record separately
    ---------------------------------- */
    const { data: member, error: memberError } =
      await supabaseAdmin
        .from("members")
        .select("role_name, active")
        .eq("profile_id", authUser.id)
        .maybeSingle();

    if (memberError) {
      return res.status(500).json({ message: "Failed to verify membership" });
    }

    /* ---------------------------------
       4️⃣ Block deactivated members
    ---------------------------------- */
    if (member?.active === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    const isMember = profile.is_member === true;

    /* ---------------------------------
       5️⃣ Attach normalized user
    ---------------------------------- */
    req.user = {
      id: profile.id,
      email: profile.email ?? authUser.email,
      full_name:
        profile.full_name ||
        authUser.user_metadata?.full_name ||
        "Guest",
      role_name: isMember
        ? member?.role_name || "Member"
        : "Guest",
      church_id: profile.church_id ?? null,
      is_member: isMember,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
