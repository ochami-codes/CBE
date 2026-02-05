import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/change-password
router.post("/", authMiddleware, async (req, res) => {
  try {
    // 1️⃣ Validate body
    const newPassword = String(req.body?.newPassword || "");

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    // 2️⃣ Validate auth user id (MUST be auth.users.id)
    const authUserId = req.user?.authUserId;

    if (!authUserId) {
      return res.status(401).json({
        message: "Authenticated user not found",
      });
    }

    // 3️⃣ Update password using ADMIN API
    const { error } =
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: newPassword,
      });

    if (error) {
      console.error("Supabase updateUserById error:", error);
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    // 4️⃣ Force re-login
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.json({
      message: "Password updated successfully. Please sign in again.",
      logout: true,
    });
  } catch (err) {
    console.error("Change password server error:", err);
    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
