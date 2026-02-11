// backend/routes/dashboard/todaysBirthdays.js
import express from "express";

const router = express.Router();

/**
 * GET /dashboard/todays-birthdays
 * Returns members in the same church whose birthday is today
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;

  if (!user?.church_id) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const today = new Date();
    const month = today.getMonth();
    const date = today.getDate();

    // Fetch all members with a birthday
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("church_id", user.church_id)
      .not("date_of_birth", "is", null);

    if (error) {
      console.error("Today's birthdays error:", error);
      return res.status(500).json({ error: "Failed to fetch birthdays" });
    }

    // Filter in JS for today’s birthdays
    const todaysBirthdays = (data ?? []).filter((p) => {
      const dob = new Date(p.date_of_birth);
      return dob.getMonth() === month && dob.getDate() === date;
    });

    res.json(todaysBirthdays);
  } catch (err) {
    console.error("Today's birthdays route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
