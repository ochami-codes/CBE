import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET /auth/me
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;

  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, role_id, church_id, is_verified")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return res.status(401).json({ user: null });
    }

    res.json({ user: profile });
  } catch (err) {
    console.error("ME error:", err);
    res.status(500).json({ user: null });
  }
});

export default router;
