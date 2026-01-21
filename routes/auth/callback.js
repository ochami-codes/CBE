// backend/routes/auth/callback.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// GET /auth/callback
router.get("/callback", async (req, res) => {
  const { access_token, refresh_token, type } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL;

  if (!access_token || !refresh_token) {
    return res.redirect(`${FRONTEND_URL}/login`);
  }

  try {
    // 1️⃣ Get user info from Supabase Auth
    const { data: userData, error: userError } = await req.supabase.auth.getUser(access_token);

    if (userError || !userData?.user) {
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    const user = userData.user;

    // 2️⃣ Password recovery flow
    if (type === "recovery") {
      return res.redirect(`${FRONTEND_URL}/reset-password-confirm?token=${access_token}`);
    }

    // 3️⃣ Enforce email verification
    if (!user.email_confirmed_at) {
      return res.redirect(`${FRONTEND_URL}/verify-email-info`);
    }

    // 4️⃣ Load profile + role from your database
    const { data: profile, error: profileError } = await req.supabase
      .from("profiles")
      .select("id, church_id, roles(id, name)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    // 5️⃣ Issue backend JWT
    const token = jwt.sign(
      {
        sub: profile.id,
        role_id: profile.roles?.id,
        church_id: profile.church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 6️⃣ Redirect frontend with JWT
    return res.redirect(`${FRONTEND_URL}/auth/callback-success?token=${token}`);
  } catch (err) {
    console.error("Auth callback error:", err);
    return res.redirect(`${FRONTEND_URL}/login`);
  }
});

export default router;
