// backend/routes/auth/invite.js
import express from "express";
import crypto from "crypto";

import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireVerified } from "../../middleware/verified.js";
import requireAdmin from "../../middleware/requireAdmin.js";
import { sendInviteEmail } from "../../utils/email.js";

const router = express.Router();

// Helper: get role ID by name
async function getRoleId(supabase, roleName) {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (error || !data) throw new Error(`Role not found: ${roleName}`);
  return data.id;
}

// POST /auth/invite — ADMIN ONLY
router.post("/", authMiddleware, requireVerified, requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const adminId = req.user.id;
  const churchId = req.user.church_id;

  const { email, password, role_name } = req.body;

  if (!email || !password || !role_name) {
    return res.status(400).json({ error: "Email, password, and role_name are required" });
  }

  try {
    // 1️⃣ Prevent duplicate accounts
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) return res.status(409).json({ error: "User with this email already exists" });

    // 2️⃣ Get role ID
    const role_id = await getRoleId(supabase, role_name);

    // 3️⃣ Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // will verify via email_token
    });

    if (authError) throw authError;

    // 4️⃣ Generate email verification token
    const email_token = crypto.randomBytes(32).toString("hex");

    // 5️⃣ Insert profile metadata
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([
        {
          id: authUser.user.id, // same ID as Supabase Auth user
          email,
          role_id,
          church_id: churchId,
          invited_by: adminId,
          email_confirmed_at: null,
          email_token,
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    // 6️⃣ Send invite email
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${email_token}`;
    await sendInviteEmail(email, verifyUrl);

    res.status(201).json({
      message: "User invited successfully",
      user: {
        id: profile.id,
        email: profile.email,
        role_id: profile.role_id,
        church_id: profile.church_id,
        email_confirmed_at: profile.email_confirmed_at,
      },
    });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "Invite failed: " + err.message });
  }
});

export default router;

