// backend/routes/auth/change-password.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAuth } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/change-password
router.post("/", authMiddleware, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters long",
    });
  }

  try {
    // Use the authenticated session from authMiddleware
    const { data, error } = await supabaseAuth.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    // Optional: force re-login
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.json({
      message: "Password updated successfully. Please sign in again.",
      logout: true,
    });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
