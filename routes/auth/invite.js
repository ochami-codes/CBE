// backend/routes/auth/invite.js
import express from "express";

import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireVerified } from "../../middleware/verified.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

// Helper: get role ID by name
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

    const { email, role_name } = req.body;

    if (!email || !role_name) {
      return res.status(400).json({
        error: "Email and role_name are required",
      });
    }

    try {
      /* ------------------ 1️⃣ Prevent duplicates ------------------ */
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      /* ------------------ 2️⃣ Resolve role ------------------ */
      const role_id = await getRoleId(supabase, role_name);

      /* ------------------ 3️⃣ Create invite via Supabase ------------------ */
      const { data: inviteData, error: inviteError } =
        await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        });

      if (inviteError || !inviteData?.user) {
        throw inviteError || new Error("Invite failed");
      }

      const userId = inviteData.user.id;

      /* ------------------ 4️⃣ Create profile ------------------ */
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        email,
        role_id,
        church_id: churchId,
        invited_by: adminId,
      });

      if (profileError) throw profileError;

      /* ------------------ 5️⃣ Done ------------------ */
      return res.status(201).json({
        message: "Invite sent successfully",
        user: {
          id: userId,
          email,
          role_name,
          church_id: churchId,
        },
      });
    } catch (err) {
      console.error("Invite error:", err);
      return res.status(500).json({
        error: "Invite failed",
        details: err.message,
      });
    }
  }
);

export default router;
