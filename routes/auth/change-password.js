import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/change-password
router.post("/", authMiddleware, async (req, res) => {
  try {
    // 1️⃣ Ensure newPassword exists and is a string
    const newPassword = String(req.body?.newPassword || "");

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    // 2️⃣ Get Supabase Auth UID from middleware
    const authUserId = req.user?.authUserId;

    if (!authUserId) {
      return res.status(401).json({ message: "Authenticated user not found" });
    }

    // 3️⃣ Prepare payload for Supabase Admin API
    const payload = { password: newPassword };

    // 🔍 Debug logs (can be removed later)
    console.log("Updating password for Auth UID:", authUserId);
    console.log("Payload being sent to Supabase:", payload);

    // 4️⃣ Update password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      payload
    );

    if (error) {
      console.error("Supabase updateUserById error:", error);
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    // 5️⃣ Force logout after password change
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
