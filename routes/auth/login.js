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

    // 2️⃣ Ensure email is verified
    if (!user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // 3️⃣ Fetch member (source of truth for role & active) using church_id from profiles
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        full_name,
        role_name,
        active,
        church_id,
        profiles (
          email
        )
      `)
      .eq("id", user.id)
      .single();

    if (memberError || !member) {
      return res.status(401).json({ message: "Member not found" });
    }

    if (!member.active) {
      return res.status(403).json({ message: "Your account has been deactivated" });
    }

    // 4️⃣ Return access token + normalized user
    res.json({
      access_token: session.access_token,
      user: {
        id: member.id,
        full_name: member.full_name,
        email: member.profiles?.email || email,
        role_name: member.role_name || "Member",
        church_id: member.church_id,
        active: member.active,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

export default router;
