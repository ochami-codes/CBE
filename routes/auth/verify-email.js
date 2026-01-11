import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// GET /auth/verify-email?token=xxxx
router.get("/", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Invalid verification link" });
  }

  try {
    // 1️⃣ Find profile by token
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email_confirmed_at")
      .eq("email_token", token)
      .single();

    if (error || !profile) {
      return res.status(400).json({
        error: "Verification link is invalid or expired",
      });
    }

    // 2️⃣ Already verified
    if (profile.email_confirmed_at) {
      return res.json({
        message: "Email already verified. You can log in.",
      });
    }

    // 3️⃣ Mark email as verified
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_confirmed_at: true,
        email_token: null,
      })
      .eq("id", profile.id);

    if (updateError) throw updateError;

    // 4️⃣ (Optional but recommended) confirm email in Supabase Auth
    await supabase.auth.admin.updateUserById(profile.id, {
      email_confirm: true,
    });

    // 5️⃣ Redirect to frontend success page
    res.redirect(
      `${process.env.FRONTEND_URL}/email-verified`
    );
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
