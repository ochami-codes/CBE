import express from "express";
import { supabaseAuth } from "../../supabaseClient.js";

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
    // Supabase will use the token automatically in the API
    const { data, error } = await supabaseAuth.auth.updateUser({
      password: newPassword,
      email: undefined,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      return res.status(400).json({
        message: error.message || "Failed to reset password",
      });
    }

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
