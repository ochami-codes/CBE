// backend/routes/dashboard/upcomingBirthdays.js
import express from "express";

const router = express.Router();

/**
 * GET /dashboard/upcoming-birthdays?days=7
 * Returns members in the same church whose birthday is in the next N days
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;
  const daysAhead = parseInt(req.query.days) || 7;

  if (!user?.church_id) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const today = new Date();
    const currentYear = today.getUTCFullYear();

    // Fetch all members of the church
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("church_id", user.church_id);

    if (error) {
      console.error("Upcoming birthdays fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch birthdays" });
    }

    const upcoming = (data ?? [])
      .map((member) => {
        if (!member.date_of_birth) return null;

        const dob = new Date(member.date_of_birth);
        if (isNaN(dob)) return null;

        let nextBirthday = new Date(currentYear, dob.getUTCMonth(), dob.getUTCDate());

        if (nextBirthday < today) {
          nextBirthday.setUTCFullYear(currentYear + 1);
        }

        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= daysAhead
          ? { id: member.id, full_name: member.full_name, date_of_birth: member.date_of_birth, days_left: diffDays }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.days_left - b.days_left);

    res.json(upcoming);
  } catch (err) {
    console.error("Upcoming birthdays error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
