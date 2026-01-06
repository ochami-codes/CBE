import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// GET /auth/verify-email?token=xxxx
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      message: "Invalid or expired verification link",
    });
  }

  try {
    // 1️⃣ Find user by email_token
    const { data: user, error } = await supabase
      .from("profiles")
      .select("id, email, role_id, church_id, is_verified")
      .eq("email_token", token)
      .single();

    if (error || !user) {
      return res.status(400).json({
        message: "Invalid or expired verification link",
      });
    }

    // 2️⃣ If already verified
    if (user.is_verified) {
      return res.status(200).json({
        message: "Email already verified. You can sign in.",
      });
    }

    // 3️⃣ Mark as verified & clear token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        email_token: null,
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // 4️⃣ OPTIONAL: auto-login token (remove if you prefer manual login)
    const authToken = jwt.sign(
      {
        sub: user.id,
        role_id: user.role_id,
        church_id: user.church_id,
        is_verified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Email verified successfully",
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        church_id: user.church_id,
      },
    });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
