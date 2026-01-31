// routes/auth/me.js
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

    // ⚠️ If profile is missing, still return user info
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

    // Normalize role_name for consistency
    const roleNameRaw = profile.roles?.name || null;
    const role_name =
      roleNameRaw?.toLowerCase() === "admin"
        ? "Admin"
        : roleNameRaw
        ? roleNameRaw
        : null;

    return res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        church_id: profile.church_id,
        role_id: profile.roles?.id ?? null,
        role_name,
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);

    return res.status(200).json({ user: null });
  }
});

export default router;
