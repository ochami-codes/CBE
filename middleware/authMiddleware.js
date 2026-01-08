import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    /* 1️⃣ Verify JWT */
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    /* 2️⃣ Fetch user profile */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role_id, church_id, email_confirmed_at, email")
      .eq("id", user.id) // ✅ IMPORTANT FIX
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    if (!profile.email_confirmed_at) {
      return res.status(403).json({ message: "Account not verified" });
    }

    /* 3️⃣ Attach user */
    req.user = {
      id: profile.id,
      email: profile.email,
      role_id: profile.role_id,
      church_id: profile.church_id,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
