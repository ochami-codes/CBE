import express from "express";
const router = express.Router();

// POST /auth/reset-password
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    // Fetch user by email
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (error || !profile) return res.status(400).json({ message: "User not found." });

    // TODO: generate a reset token (JWT valid for short time)
    const resetToken = require("jsonwebtoken").sign(
      { sub: profile.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // In a real app: send email with link like `${FRONTEND_URL}/reset-password?token=${resetToken}`
    // For now, just return token for testing
    res.json({ message: "Password reset token generated.", token: resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
