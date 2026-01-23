// backend/routes/auth/reset-password.js
import express from "express";
import { sendInviteEmail } from "../../utils/email.js";

const router = express.Router();

// POST /auth/reset-password
router.post("/", async (req, res) => {
  const { email } = req.body;
  const supabase = req.supabase;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // 1️⃣ Fetch user using Admin API
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserByEmail(email);

    // Anti-enumeration: always same response
    if (userError || !userData?.user) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // 2️⃣ Generate reset link
    const { data: resetData, error: resetError } =
      await supabase.auth.admin.generateLink("resetPassword", email);

    if (resetError) throw resetError;

    const resetLink = resetData?.action_link;
    if (!resetLink) throw new Error("Failed to generate reset link");

    // 3️⃣ Send email
    await sendInviteEmail({
      to: email,
      subject: "Reset your password",
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link expires according to Supabase policy.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    return res.json({
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
