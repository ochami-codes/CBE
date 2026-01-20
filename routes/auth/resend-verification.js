// backend/routes/auth/resend-verification.js
import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/resend-verification
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Generate a new signup verification link (Supabase sends the email)
    const { error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
    });

    if (error) {
      console.error("Resend verification error:", error);
      // Still return generic message (anti-enumeration)
    }

    // Always respond the same way
    return res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  } catch (err) {
    console.error("Resend verification route error:", err);
    return res.status(500).json({
      message: "If the email exists, a verification link has been sent.",
    });
  }
});

export default router;
