// backend/routes/auth/login.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /auth/login
router.post("/", async (req, res) => {
  const { email, password } = req.body;
  const supabase = req.supabase;

  if (!email || !password) {
    return res.status(400).json({
      error: "Invalid request",
      details: "Email and password are required",
    });
  }

  try {
    // 1️⃣ Authenticate
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Login failed",
        details: "Invalid email or password",
      });
    }

    // 2️⃣ Verify email (AUTH is the truth)
    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({
        error: "Email not verified",
        details: "Please verify your email before logging in",
      });
    }

    // 3️⃣ Fetch profile + role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        church_id,
        roles ( id, name )
      `)
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        error: "Login failed",
        details: "Profile not found",
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

    // 5️⃣ Respond
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
