import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    // 1️⃣ Verify Supabase access token
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // 2️⃣ Load member info from your members table (source of truth)
    //    Use `profile_id` if it stores Supabase Auth UID, otherwise `id`
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        full_name,
        role_name,
        active,
        church_id,
        profiles (email)
      `)
      .eq("id", user.id) // ✅ adjust to profile_id if needed: .eq("profile_id", user.id)
      .single();

    if (memberError || !member) {
      return res.status(401).json({ message: "Member record not found" });
    }

    // 🚫 Block deactivated members
    if (member.active === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    // 3️⃣ Attach normalized user object, plus Supabase UID
    req.user = {
      id: member.id,             // members table ID
      authUserId: user.id,       // ✅ Supabase Auth UID for admin actions
      email: member.profiles?.email ?? null,
      full_name: member.full_name,
      church_id: member.church_id,
      role_name: member.role_name || "Member",
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
