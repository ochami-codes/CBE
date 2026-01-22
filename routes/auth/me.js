import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// GET /auth/me
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      user: null,
      message: "Unauthenticated",
    });
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

    if (error || !profile) {
      console.error("Profile fetch error:", error);
      return res.status(404).json({
        user: null,
        message: "Profile not found",
      });
    }

    res.json({
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
    res.status(500).json({
      user: null,
      message: "Internal server error",
    });
  }
});

export default router;
