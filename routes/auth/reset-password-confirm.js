import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/reset-password-confirm
router.post("/", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Reset token and new password are required" });
  }

  try {
    // 1️⃣ Exchange the recovery token for a session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.exchangeRecoveryToken(token);

    if (sessionError || !sessionData?.user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const userId = sessionData.user.id;

    // 2️⃣ Update the user's password using Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({ message: updateError.message || "Failed to reset password" });
    }

    return res.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    console.error("Reset password confirm error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
});

export default router;
