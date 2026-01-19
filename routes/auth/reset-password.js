// backend/routes/auth/reset-password.js
import express from "express";
import { supabase } from "../../supabaseClient.js";
import { sendInviteEmail } from "../../utils/email.js";

const router = express.Router();

// POST /auth/reset-password
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // 1️⃣ Fetch user from Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    // Always respond the same to avoid email enumeration
    if (userError || !userData?.user) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const userId = userData.user.id;

    // 2️⃣ Generate password reset link using Supabase admin API
    const { data: resetData, error: resetError } =
      await supabase.auth.admin.generateLink("resetPassword", email);

    if (resetError) throw resetError;

    const resetLink = resetData?.action_link;
    if (!resetLink) throw new Error("Failed to generate reset link");

    // 3️⃣ Send reset email
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

    res.json({
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
