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
    const month = today.getUTCMonth(); // UTC to match birthday comparison
    const date = today.getUTCDate();

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

    const todaysBirthdays = (data ?? []).filter((p) => {
      const dob = new Date(p.date_of_birth);
      if (isNaN(dob)) return false; // skip invalid dates
      return dob.getUTCMonth() === month && dob.getUTCDate() === date;
    });

    // Map to a consistent shape for frontend
    const result = todaysBirthdays.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      date_of_birth: p.date_of_birth,
    }));

    res.json(result);
  } catch (err) {
    console.error("Today's birthdays route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
