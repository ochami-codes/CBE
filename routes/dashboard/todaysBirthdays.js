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
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayKey = `${mm}-${dd}`;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("church_id", user.church_id)
      .not("date_of_birth", "is", null)
      .filter(
        "to_char(date_of_birth, 'MM-DD')",
        "eq",
        todayKey
      );

    if (error) {
      console.error("Today's birthdays error:", error);
      return res.status(500).json({ error: "Failed to fetch birthdays" });
    }

    res.json(data ?? []);
  } catch (err) {
    console.error("Today's birthdays route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
