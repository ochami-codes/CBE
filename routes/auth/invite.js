import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireVerified } from  "../../middleware/verified.js";
import  requireAdmin  from "../../middleware/requireAdmin.js";
import { sendInviteEmail } from "../../utils/email.js"; // Resend helper

const router = express.Router();

// Utility: get role ID safely
async function getRoleId(supabase, roleName) {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (error || !data) {
    throw new Error(`Role not found: ${roleName}`);
  }

  return data.id;
}

// POST /auth/invite — ADMIN ONLY
router.post(
  "/",
  authMiddleware,
  requireVerified,
  requireAdmin,
  async (req, res) => {
    const supabase = req.supabase;
    const adminId = req.user.id;
    const churchId = req.user.church_id;

    const { email, password, role_name } = req.body;

    if (!email || !password || !role_name) {
      return res.status(400).json({
        error: "Email, password, and role_name are required",
      });
    }

    try {
      // 1️⃣ Prevent duplicate accounts
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (existing) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      // 2️⃣ Resolve role
      const role_id = await getRoleId(supabase, role_name);

      // 3️⃣ Hash password
      const password_hash = bcrypt.hashSync(password, 10);

      // 4️⃣ Generate email verification token
      const email_token = crypto.randomBytes(32).toString("hex");

      // 5️⃣ Create invited user (same church as admin)
      const { data: profile, error } = await supabase
        .from("profiles")
        .insert([
          {
            email,
            password_hash,
            role_id,
            church_id: churchId,
            invited_by: adminId,
            is_verified: false,
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
          is_verified: profile.is_verified,
        },
      });
    } catch (err) {
      console.error("Invite error:", err);
      res.status(500).json({
        error: "Invite failed",
      });
    }
  }
);

export default router;
