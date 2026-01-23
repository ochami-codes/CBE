// backend/routes/auth/change-password.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// POST /auth/change-password
router.post("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { newPassword } = req.body;

  if (!req.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long",
    });
  }

  try {
    /* ------------------ 1️⃣ Update password ------------------ */
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    /* ------------------ 2️⃣ Optional: force re-login ------------------ */
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
