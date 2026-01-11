import express from "express";
import crypto from "crypto";
import { supabase } from "../../supabaseClient.js";
import { sendInviteEmail } from "../../utils/email.js";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const { full_name, email, password, church_name } = req.body;

  if (!full_name || !email || !password || !church_name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    /* -------------------------------------------------
       1️⃣ Check if auth user already exists
    ------------------------------------------------- */
    const { data: existingAuth } =
      await supabase.auth.admin.getUserByEmail(email);

    if (existingAuth?.user) {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    /* -------------------------------------------------
       2️⃣ Find or create church
    ------------------------------------------------- */
    let { data: church } = await supabase
      .from("churches")
      .select("id")
      .eq("name", church_name.trim())
      .single();

    if (!church) {
      const { data: newChurch, error: churchError } =
        await supabase
          .from("churches")
          .insert({ name: church_name.trim() })
          .select("id")
          .single();

      if (churchError) throw churchError;
      church = newChurch;
    }

    /* -------------------------------------------------
       3️⃣ Get default role (Member)
    ------------------------------------------------- */
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Member")
      .single();

    if (roleError || !role) {
      return res.status(500).json({ error: "Default role not found" });
    }

    /* -------------------------------------------------
       4️⃣ Create Supabase Auth user (THIS IS CRITICAL)
    ------------------------------------------------- */
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: false,
      });

    if (authError) throw authError;

    const userId = authData.user.id;

    /* -------------------------------------------------
       5️⃣ Create profile linked to auth.users
    ------------------------------------------------- */
    const email_token = crypto.randomBytes(32).toString("hex");

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,              // 🔑 FK → auth.users.id
        email: email.trim(),
        full_name: full_name.trim(),
        role_id: role.id,
        church_id: church.id,
        email_token,
      });

    if (profileError) throw profileError;

    /* -------------------------------------------------
       6️⃣ Send verification email
    ------------------------------------------------- */
    const verifyUrl =
      `${process.env.FRONTEND_URL}/verify-email?token=${email_token}`;

    await sendInviteEmail({
      to: email,
      subject: "Verify your email",
      html: `
        <p>Hello ${full_name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>If you didn’t register, you can ignore this email.</p>
      `,
    });

    /* -------------------------------------------------
       ✅ Done
    ------------------------------------------------- */
    res.status(201).json({
      message:
        "Registration successful! Please check your email to verify your account.",
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      error: "Failed to create account. Please try again.",
    });
  }
});

export default router;
