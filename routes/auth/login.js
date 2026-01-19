// backend/routes/auth/login.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /auth/login
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Invalid request",
      details: "Email and password are required",
    });
  }

  try {
    // 1️⃣ Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Login failed",
        details: "Invalid email or password",
      });
    }

    const userId = authData.user.id;

    // 2️⃣ Fetch profile + role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        email_confirmed_at,
        church_id,
        roles ( id, name )
      `)
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        error: "Login failed",
        details: "Profile not found",
      });
    }

    // 3️⃣ Block unverified emails
    if (!profile.email_confirmed_at) {
      return res.status(403).json({
        error: "Email not verified",
        details: "Please verify your email before logging in",
      });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      {
        sub: profile.id,
        role_id: profile.roles.id,
        church_id: profile.church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5️⃣ Respond cleanly
    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        role_name: profile.roles.name,
        church_id: profile.church_id,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: "Server error",
      details: "Something went wrong during login",
    });
  }
});

export default router;
