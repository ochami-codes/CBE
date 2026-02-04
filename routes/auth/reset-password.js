// backend/routes/auth/reset-password.js
import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Supabase sends the reset password email automatically
    const { data, error } = await supabaseAdmin.auth.admin.resetUserPasswordForEmail(email);

    if (error) {
      console.error("Supabase reset error:", error);
      // Anti-enumeration: still respond the same
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Success (email sent by Supabase)
    return res.json({
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Reset password route error:", err);
    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
