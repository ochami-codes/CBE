// middleware/authMiddleware.js
import { supabaseAuth, supabaseAdmin } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    /* 1️⃣ Verify Supabase access token */
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    /* 2️⃣ Load profile (ADMIN client) */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role_id, church_id, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* 3️⃣ Attach user to request */
    req.user = {
      id: profile.id,
      email: profile.email,
      role_id: profile.role_id,
      church_id: profile.church_id,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
