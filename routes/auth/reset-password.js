import express from "express";
import jwt from "jsonwebtoken";
import { sendInviteEmail } from "../../utils/email.js";

const router = express.Router();

// POST /auth/reset-password
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Fetch user by email
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    // Always respond the same (avoid email enumeration)
    if (error || !profile) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Generate short-lived reset token
    const resetToken = jwt.sign(
      { sub: profile.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password-confirm?token=${resetToken}`;

    // Send reset email
    await sendEmail({
      to: profile.email,
      subject: "Reset your password",
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to set a new password:</p>
        <p>
          <a href="${resetLink}">Reset Password</a>
        </p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    res.json({
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
