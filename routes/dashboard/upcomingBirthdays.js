// backend/routes/dashboard/upcomingBirthdays.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /dashboard/upcoming-birthdays?days=7
 * Returns members in the same church whose birthday is in the next N days
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;
  const daysAhead = parseInt(req.query.days) || 7;

  if (!user?.church_id) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Fetch all members of the church
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("church_id", user.church_id);

    if (error) {
      console.error("Upcoming birthdays fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch birthdays" });
    }

    // Filter for upcoming birthdays
    const upcoming = data
      .map((member) => {
        if (!member.date_of_birth) return null;

        const dob = new Date(member.date_of_birth);
        let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

        if (nextBirthday < today) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= daysAhead ? { ...member, daysUntil: diffDays } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    res.json(upcoming);
  } catch (err) {
    console.error("Upcoming birthdays error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
