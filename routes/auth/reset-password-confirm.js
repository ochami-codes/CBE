// backend/routes/auth/reset-password-confirm.js
import express from "express";

const router = express.Router();

// POST /auth/reset-password-confirm
router.post("/", async (req, res) => {
  const { token, newPassword } = req.body;
  const supabase = req.supabase;

  if (!token || !newPassword) {
    return res.status(400).json({
      message: "Reset token and new password are required",
    });
  }

  try {
    /* ------------------ 1️⃣ Exchange recovery token ------------------ */
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(token);

    if (exchangeError || !sessionData?.session) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    /* ------------------ 2️⃣ Update password ------------------ */
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({
        message: updateError.message || "Failed to reset password",
      });
    }

    /* ------------------ 3️⃣ Done ------------------ */
    return res.json({
      message: "Password reset successful. You can now sign in.",
    });
  } catch (err) {
    console.error("Reset password confirm error:", err);
    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
