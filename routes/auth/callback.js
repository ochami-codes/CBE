// backend/routes/auth/callback.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// GET /auth/callback?access_token=xxx&type=xxx
router.get("/callback", async (req, res) => {
  const { access_token, type } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL;

  if (!access_token) {
    return res.redirect(`${FRONTEND_URL}/login`);
  }

  try {
    // 1️⃣ Validate Supabase access token
    const { data: userData, error: userError } =
      await req.supabase.auth.getUser(access_token);

    if (userError || !userData?.user) {
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    const userId = userData.user.id;

    // 2️⃣ Fetch profile + role from your database
    const { data: profile, error: profileError } = await req.supabase
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
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    // 3️⃣ Recovery flow (password reset)
    if (type === "recovery") {
      return res.redirect(
        `${FRONTEND_URL}/reset-password-confirm?token=${access_token}`
      );
    }

    // 4️⃣ Block unverified emails
    if (!profile.email_confirmed_at) {
      return res.redirect(`${FRONTEND_URL}/verify-email-info`);
    }

    // 5️⃣ Issue your backend JWT
    const token = jwt.sign(
      {
        sub: profile.id,
        role_id: profile.roles.id,
        church_id: profile.church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 6️⃣ Redirect frontend to callback-success with your JWT
    return res.redirect(
      `${FRONTEND_URL}/auth/callback-success?token=${token}`
    );
  } catch (err) {
    console.error("Auth callback error:", err);
    return res.redirect(`${FRONTEND_URL}/login`);
  }
});

export default router;
