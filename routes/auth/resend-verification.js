import express from "express";
import crypto from "crypto";
import { sendEmail } from "../../utils/email.js";

const router = express.Router();

// POST /auth/resend-verification
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Find user profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, is_verified")
      .eq("email", email)
      .single();

    // Always respond the same (avoid email enumeration)
    if (error || !profile) {
      return res.json({
        message: "If the email exists, a verification link has been sent.",
      });
    }

    // Already verified
    if (profile.is_verified) {
      return res.json({
        message: "If the email exists, a verification link has been sent.",
      });
    }

    // Generate new verification token
    const email_token = crypto.randomBytes(32).toString("hex");

    // Save token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email_token })
      .eq("id", profile.id);

    if (updateError) throw updateError;

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${email_token}`;

    // Send verification email
    await sendEmail({
      to: profile.email,
      subject: "Verify your email address",
      html: `
        <p>Welcome!</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p>
          <a href="${verifyUrl}">Verify Email</a>
        </p>
        <p>If you did not create an account, you can ignore this email.</p>
      `,
    });

    res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
