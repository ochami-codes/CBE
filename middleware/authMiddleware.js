import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key
);

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    // 1️⃣ Verify JWT via Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // 2️⃣ Fetch user profile from your profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role_id, church_id, is_verified, email")
      .eq("email", user.email)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Unauthorized: profile not found" });
    }

    // 3️⃣ Attach verified user info to req.user
    req.user = {
      id: profile.id,
      email: profile.email,
      role_id: profile.role_id,
      church_id: profile.church_id,
      is_verified: profile.is_verified,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
