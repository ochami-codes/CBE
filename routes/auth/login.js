// backend/routes/auth/login.js
import express from "express";
import jwt from "jsonwebtoken";
import {
  supabaseAuth,
  supabaseAdmin,
} from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/login
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    /* -------- 1️⃣ Authenticate user (AUTH CLIENT) -------- */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData?.user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    /* -------- 2️⃣ Email verification check -------- */
    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const userId = authData.user.id;

    /* -------- 3️⃣ Fetch profile + role (ADMIN CLIENT) -------- */
    const { data: profile, error: profileError } =
      await supabaseAdmin
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
      console.error(profileError);
      return res.status(401).json({
        message: "Profile not found",
      });
    }

    if (!profile.roles) {
      return res.status(500).json({
        message: "User role is missing",
      });
    }

    /* -------- 4️⃣ Create APP JWT -------- */
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

    /* -------- 5️⃣ Respond -------- */
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
      message: "Server error during login",
    });
  }
});

export default router;
