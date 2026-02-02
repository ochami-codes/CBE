import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 * Source of truth: members table
 */
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(200).json({ user: null });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        full_name,
        role_name,
        active,
        church_id,
        profiles (
          email
        )
      `)
      .eq("id", userId)
      .single();

    if (error || !data) {
      return res.status(200).json({ user: null });
    }

    // 🚫 Deactivated member
    if (data.active === false) {
      return res.status(403).json({
        error: "Account deactivated",
        user: null,
      });
    }

    return res.status(200).json({
      user: {
        id: data.id,
        email: data.profiles?.email ?? null,
        full_name: data.full_name,
        church_id: data.church_id,
        role_name: data.role_name || "Member",
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
