// backend/routes/auth/resend-verification.js
import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/resend-verification
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    // Supabase will resend the signup confirmation email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error("Resend verification error:", error);
      // Do NOT expose details (anti-enumeration)
    }

    // Always return same response
    return res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  } catch (err) {
    console.error("Resend verification route error:", err);
    return res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  }
});

export default router;
