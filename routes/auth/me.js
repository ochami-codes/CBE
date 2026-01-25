import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// GET /auth/me
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(200).json({ user: null });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        id,
        email,
        full_name,
        church_id,
        roles (
          id,
          name
        )
        `
      )
      .eq("id", userId)
      .single();

    // ⚠️ IMPORTANT: don't break auth if profile is missing
    if (error || !profile) {
      return res.status(200).json({
        user: {
          id: userId,
          role_id: null,
          role_name: null,
          incomplete_profile: true,
        },
      });
    }

    return res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        church_id: profile.church_id,
        role_id: profile.roles?.id ?? null,
        role_name: profile.roles?.name ?? null,
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);

    // Never trap auth in loading state
    return res.status(200).json({ user: null });
  }
});

export default router;
