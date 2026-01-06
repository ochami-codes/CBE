import express from "express";

const router = express.Router();

router.get("/callback", async (req, res) => {
  const { access_token, refresh_token, type } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL;
  const isProd = process.env.NODE_ENV === "production";

  if (!access_token || !refresh_token) {
    return res.redirect(`${FRONTEND_URL}/login`);
  }

  try {
    // 1️⃣ Validate token with Supabase
    const { data: userData, error: userError } = await req.supabase.auth.getUser(
      access_token
    );

    if (userError || !userData?.user) {
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    const userId = userData.user.id;

    // 2️⃣ Fetch profile from your DB
    const { data: profile, error: profileError } = await req.supabase
      .from("profiles")
      .select("id, email, role_id, church_id, is_verified")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found for user:", userId);
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    // 3️⃣ Set httpOnly cookies for session
    res.cookie("sb-access-token", access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    // 4️⃣ Redirect based on type or verification status
    if (type === "recovery") {
      return res.redirect(`${FRONTEND_URL}/reset-password-confirm?token=${access_token}`);
    }

    if (!profile.is_verified) {
      return res.redirect(`${FRONTEND_URL}/verify-email-info`);
    }

    // 5️⃣ Optional: first login / role-based redirect
    // e.g., if role_id === admin → /dashboard/admin
    // otherwise → /dashboard
    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error("Callback error:", err);
    return res.redirect(`${FRONTEND_URL}/login`);
  }
});

export default router;
