import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET /auth/me
// Returns the currently authenticated user's profile
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      user: null,
      error: "Unauthenticated",
    });
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        full_name,
        church_id,
        email_confirmed_at,
        roles (
          id,
          name
        )
      `
      )
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        user: null,
        error: "Profile not found",
      });
    }

    // Normalize response for frontend
    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        church_id: profile.church_id,
        email_confirmed_at: profile.email_confirmed_at,
        role_id: profile.roles?.id ?? null,
        role_name: profile.roles?.name ?? null,
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    res.status(500).json({
      user: null,
      error: "Internal server error",
    });
  }
});

export default router;
