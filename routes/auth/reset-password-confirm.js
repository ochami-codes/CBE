// backend/routes/auth/reset-password-confirm.js
import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/reset-password-confirm
router.post("/", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      message: "Reset token and new password are required",
    });
  }

  try {
    // 1️⃣ Verify the token with Supabase Auth (JWT token)
    const { data: userData, error: userError } = await supabase.auth.admin.getUser(token);

    if (userError || !userData?.user) {
      return res.status(400).json({
        message: "Reset token is invalid or expired",
      });
    }

    const userId = userData.user.id;

    // 2️⃣ Update password via Supabase Auth
    const { data: updatedUser, error: updateError } =
      await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true, // optional: confirm email when password reset
      });

    if (updateError) throw updateError;

    res.json({
      message: "Password reset successful. You can now sign in.",
    });
  } catch (err) {
    console.error("Reset password confirm error:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
