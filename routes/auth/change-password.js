import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/change-password
router.post("/", authMiddleware, async (req, res) => {
  const { newPassword } = req.body;

  // Debug: see which Supabase SDK we have
  console.log("supabaseAuth type:", supabaseAuth.auth.constructor.name);

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters long",
    });
  }

  try {
    let updateResult;

    // CASE 1: Using client SDK (authenticated user)
    if (supabaseAuth.auth.constructor.name === "SupabaseClient") {
      updateResult = await supabaseAuth.auth.updateUser({ password: newPassword });
    }
    // CASE 2: Using admin SDK
    else if (supabaseAdmin.auth.admin) {
      const userId = req.user?.id; // obtained from authMiddleware
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      updateResult = await supabaseAdmin.auth.admin.updateUser(userId, { password: newPassword });
    } else {
      return res.status(500).json({ message: "Supabase client not configured correctly" });
    }

    const { data, error } = updateResult;

    if (error) {
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    // Clear cookies and force logout
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
