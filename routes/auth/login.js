// backend/routes/auth/login.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/login
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 1️⃣ Authenticate user with Supabase Auth (PUBLIC client)
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    const user = authData.user;
    const session = authData.session;

    if (authError || !user || !session) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2️⃣ Ensure email is verified in Supabase Auth
    if (!user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // 3️⃣ Fetch profile + role using ADMIN client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        church_id,
        roles ( id, name )
      `)
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(profileError);
      return res.status(401).json({ message: "Profile not found" });
    }

    if (!profile.roles) {
      return res.status(500).json({ message: "User role is missing" });
    }

    // 4️⃣ Return access token + user info
    res.json({
      access_token: session.access_token,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role_name: profile.roles.name,
        church_id: profile.church_id,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

export default router;
