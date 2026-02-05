import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/change-password
router.post("/", authMiddleware, async (req, res) => {
  // 🔍 DEBUG LOGS — START
  console.log("RAW req.body:", req.body);
  console.log("req.body type:", typeof req.body);
  console.log("req.body.newPassword:", req.body?.newPassword);
  console.log("typeof newPassword:", typeof req.body?.newPassword);
  // 🔍 DEBUG LOGS — END

  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters long",
    });
  }

  try {
    const userId = req.user.id; // we’ll validate this later if needed

    const payload = { password: newPassword };

    // 🔍 FINAL PAYLOAD LOG
    console.log("SUPABASE PAYLOAD:", payload);
    console.log("payload.password type:", typeof payload.password);

    const { data, error } =
      await supabaseAdmin.auth.admin.updateUserById(userId, payload);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.json({
      message: "Password updated successfully. Please sign in again.",
      logout: true,
    });
  } catch (err) {
    console.error("Change password error (catch):", err);
    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
