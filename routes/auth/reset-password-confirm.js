import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const router = express.Router();

// POST /auth/reset-password-confirm
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { token, newPassword } = req.body;

  if (!token || !newPassword) return res.status(400).json({ message: "Token and new password are required." });

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.sub;

    const password_hash = bcrypt.hashSync(newPassword, 10);

    const { error } = await supabase
      .from("profiles")
      .update({ password_hash })
      .eq("id", userId);

    if (error) throw error;

    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
