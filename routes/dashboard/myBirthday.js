// backend/routes/dashboard/myBirthday.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /dashboard/my-birthday
 * Returns logged-in user's name and date of birth
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthenticated",
    });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, date_of_birth")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    res.json({
      full_name: data.full_name,
      date_of_birth: data.date_of_birth,
    });
  } catch (err) {
    console.error("My birthday route error:", err);
    res.status(500).json({
      error: "Failed to load birthday information",
    });
  }
});

export default router;
