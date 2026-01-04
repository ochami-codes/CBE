// routes/auth/callback.js
import express from "express";

const router = express.Router();

router.get("/callback", async (req, res) => {
  const { access_token, refresh_token, type } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL;

  if (!access_token || !refresh_token) {
    return res.redirect(`${FRONTEND_URL}/login`);
  }

  try {
    // 1️⃣ Validate token by fetching user
    const { data: userData, error } = await req.supabase.auth.getUser(
      access_token
    );

    if (error || !userData?.user) {
      return res.redirect(`${FRONTEND_URL}/login`);
    }

    // 2️⃣ Create YOUR OWN session (cookies)
    res.cookie("sb-access-token", access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    // 3️⃣ Decide redirect destination
    if (type === "recovery") {
      return res.redirect(`${FRONTEND_URL}/reset-password-confirm`);
    }

    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${FRONTEND_URL}/login`);
  }
});

export default router;
