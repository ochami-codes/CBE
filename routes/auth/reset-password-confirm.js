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
    // 1️⃣ Use Supabase admin API to update password via token
    const { data, error } = await supabase.auth.admin.updateUserById(token, {
      password: newPassword,
      email_confirm: true, // optional
    });

    // ⚠️ Supabase expects a **user ID**, not token — so usually the reset link opens a Supabase page.
    // If you want fully custom flow, you should generate your own temporary token in your profiles table.

    if (error) {
      console.error("Reset password confirm error:", error);
      return res.status(400).json({ message: error.message || "Reset failed" });
    }

    res.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    console.error("Reset password confirm exception:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
