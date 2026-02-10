// backend/routes/auth/login.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

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
    /* ---------------------------------
       1️⃣ Authenticate via Supabase Auth
    ---------------------------------- */
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data?.session) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const { user, session } = data;

    /* ---------------------------------
       2️⃣ Ensure email is verified
    ---------------------------------- */
    if (!user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    /* ---------------------------------
       3️⃣ Fetch profile (REQUIRED)
       profiles.id === auth.user.id
    ---------------------------------- */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, church_id")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return res.status(401).json({
        message: "Profile record not found",
      });
    }

    /* ---------------------------------
       4️⃣ Fetch member (OPTIONAL)
       members.id === profiles.id
    ---------------------------------- */
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, role_name, active, church_id")
      .eq("id", profile.id)
      .maybeSingle();

    // Member exists but is inactive
    if (member && member.active === false) {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    /* ---------------------------------
       5️⃣ Success response
    ---------------------------------- */
    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role_name: member?.role_name || "Guest",
        church_id: member?.church_id || profile.church_id || null,
        active: member?.active ?? true,
        is_member: !!member,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Server error during login",
    });
  }
});

export default router;
