import express from "express";
import bcrypt from "bcryptjs";

const router = express.Router();

// POST /auth/reset-password-confirm
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password required" });
  }

  try {
    // 1️⃣ Find profile by reset token
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, password_reset_expires")
      .eq("password_reset_token", token)
      .single();

    if (error || !profile) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // 2️⃣ Check expiration
    if (new Date(profile.password_reset_expires) < new Date()) {
      return res.status(400).json({ message: "Reset token expired" });
    }

    // 3️⃣ Hash new password
    const password_hash = bcrypt.hashSync(password, 10);

    // 4️⃣ Update password & invalidate token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
      })
      .eq("id", profile.id);

    if (updateError) throw updateError;

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
