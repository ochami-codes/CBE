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

    /* 2️⃣ Load profile WITH role name */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        email,
        church_id,
        role_id,
        roles (
          id,
          name
        )
      `)
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: "Profile not found" });
    }

    /* 3️⃣ Attach normalized user */
    req.user = {
      id: profile.id,
      email: profile.email,
      church_id: profile.church_id,
      role_id: profile.role_id,
      role_name: profile.roles?.name ?? null,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
