// backend/routes/auth/verify-email.js
import express from "express";

const router = express.Router();

// POST /auth/verify-email
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Invalid or missing verification token" });
  }

  try {
    // 1️⃣ Find profile by token
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email_confirmed_at")
      .eq("email_token", token)
      .single();

    if (error || !profile) {
      return res.status(400).json({ message: "Verification link is invalid or expired" });
    }

    // 2️⃣ Already verified
    if (profile.email_confirmed_at) {
      return res.json({ message: "Email already verified. You can log in." });
    }

    // 3️⃣ Mark email as verified in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_confirmed_at: new Date().toISOString(),
        email_token: null,
      })
      .eq("id", profile.id);

    if (updateError) throw updateError;

    // 4️⃣ Update Supabase Auth user (optional but recommended)
    try {
      await supabase.auth.admin.updateUserById(profile.id, { email_confirm: true });
    } catch (authErr) {
      console.warn("Supabase auth email confirmation skipped:", authErr.message);
    }

    // 5️⃣ Respond with success
    res.json({ message: "Your email has been verified successfully." });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ message: "Verification failed. Please try again later." });
  }
});

export default router;
