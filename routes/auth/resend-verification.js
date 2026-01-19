// backend/routes/auth/resend-verification.js
import express from "express";
import { supabase } from "../../supabaseClient.js"; // make sure your supabase client is imported
import { authMiddleware } from "../../middleware/authMiddleware.js"; // optional if only logged-in users can trigger

const router = express.Router();

// POST /auth/resend-verification
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // 1️⃣ Fetch the user from Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    // Always respond the same way to avoid email enumeration
    if (userError || !userData?.user) {
      return res.json({
        message: "If the email exists, a verification link has been sent.",
      });
    }

    const user = userData.user;

    // 2️⃣ Check if already confirmed
    if (user.email_confirmed_at) {
      return res.json({
        message: "If the email exists, a verification link has been sent.",
      });
    }

    // 3️⃣ Resend the verification email using Supabase admin API
    const { error: resendError } = await supabase.auth.admin.resendVerificationEmail(user.id);

    if (resendError) {
      console.error("Supabase resend verification error:", resendError);
      return res.status(500).json({ message: "Failed to resend verification email" });
    }

    // 4️⃣ Success response
    res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  } catch (err) {
    console.error("Resend verification route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
