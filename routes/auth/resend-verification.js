import express from "express";

const router = express.Router();

// POST /auth/resend-verification
router.post("/", async (req, res) => {
  const { email } = req.body;
  const supabase = req.supabase;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (error) {
      // Log internally only (anti-enumeration)
      console.error("Resend verification error:", error);
    }

    // Always same response (security best practice)
    return res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  } catch (err) {
    console.error("Resend verification route error:", err);
    return res.json({
      message: "If the email exists, a verification link has been sent.",
    });
  }
});

export default router;
