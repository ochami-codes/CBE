// backend/routes/auth/login.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../../supabaseClient.js"; // ✅ single source of truth

const router = express.Router();

// POST /auth/login
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      error: "Invalid request",
      details: "Email and password are required",
    });
  }

  try {
    /* ------------------ 1️⃣ Authenticate user ------------------ */
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData?.user) {
      return res.status(401).json({
        error: "Login failed",
        details: "Invalid email or password",
      });
    }

    /* ------------------ 2️⃣ Verify email (Auth is authoritative) ------------------ */
    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({
        error: "Email not verified",
        details: "Please verify your email before logging in",
      });
    }

    const userId = authData.user.id;

    /* ------------------ 3️⃣ Fetch profile + role ------------------ */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        church_id,
        roles (
          id,
          name
        )
      `
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return res.status(401).json({
        error: "Login failed",
        details: "Profile not found",
      });
    }

    if (!profile.roles) {
      return res.status(500).json({
        error: "Configuration error",
        details: "User role is missing",
      });
    }

    /* ------------------ 4️⃣ Generate app JWT ------------------ */
    const token = jwt.sign(
      {
        sub: profile.id,
        role_id: profile.roles.id,
        role_name: profile.roles.name,
        church_id: profile.church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    /* ------------------ 5️⃣ Respond ------------------ */
    return res.json({
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
    return res.status(500).json({
      error: "Server error",
      details: "Something went wrong during login",
    });
  }
});

export default router;
