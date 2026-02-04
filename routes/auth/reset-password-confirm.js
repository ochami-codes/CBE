import express from "express";
import { supabaseAuth } from "../../supabaseClient.js"; // ✅ normal client, not admin

const router = express.Router();

// POST /auth/reset-password-confirm
router.post("/", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Reset token and new password are required" });
  }

  try {
    // Supabase requires the token to authorize password update
    const { data, error } = await supabaseAuth.auth.updateUser(
      { password: newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (error) {
      return res.status(400).json({ message: error.message || "Failed to reset password" });
    }

    return res.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    console.error("Reset password confirm error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
});

export default router;
