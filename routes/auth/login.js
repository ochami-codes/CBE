import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    /* ---------------------------------
       1️⃣ Authenticate via Supabase
    ---------------------------------- */
    const { data, error } =
      await supabaseAuth.auth.signInWithPassword({
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
       2️⃣ Ensure email verified
    ---------------------------------- */
    if (!user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    /* ---------------------------------
       3️⃣ Fetch profile (SOURCE OF TRUTH)
    ---------------------------------- */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          church_id,
          is_member
        `)
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({
        message: "Failed to fetch profile",
      });
    }

    if (!profile) {
      return res.status(401).json({
        message: "Profile record not found",
      });
    }

    /* ---------------------------------
       4️⃣ Fetch member record (if exists)
    ---------------------------------- */
    const { data: member, error: memberError } =
      await supabaseAdmin
        .from("members")
        .select("role_name, active")
        .eq("profile_id", profile.id)
        .maybeSingle();

    if (memberError) {
      console.error("Member fetch error:", memberError);
      return res.status(500).json({
        message: "Failed to fetch membership status",
      });
    }

    /* ---------------------------------
       5️⃣ Block deactivated members
    ---------------------------------- */
    if (member?.active === false) {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    const isMember = profile.is_member === true;

    /* ---------------------------------
       6️⃣ Success
    ---------------------------------- */
    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        church_id: profile.church_id || null,
        role_name: isMember
          ? member?.role_name || "Member"
          : "Guest",
        active: member?.active ?? true,
        is_member: isMember,
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
