// backend/routes/dashboard/todaysBirthdays.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /dashboard/todays-birthdays
 * Returns members in the same church whose birthday is today
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;

  if (!user?.church_id) {
    return res.status(401).json({
      error: "Unauthenticated",
    });
  }

  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Match MM-DD regardless of year
    const matchPattern = `%-${month}-${day}`;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("church_id", user.church_id)
      .ilike("date_of_birth", matchPattern);

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch birthdays",
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Today's birthdays error:", err);
    res.status(500).json({
      error: "Server error",
    });
  }
});

export default router;
