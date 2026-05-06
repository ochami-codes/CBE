// backend/routes/dashboard/upcomingBirthdays.js
import express from "express";

const router = express.Router();

/**
 * GET /dashboard/upcoming-birthdays?days=7
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;

  const churchId = user?.active_church_id;
  const daysAhead = parseInt(req.query.days) || 7;

  if (!churchId) {
    return res.status(401).json({
      error: "No active church selected",
    });
  }

  try {
    const today = new Date();
    const currentYear = today.getUTCFullYear();

    /* ---------------- FETCH MEMBERS ---------------- */
    const { data, error } = await supabase
      .from("members")
      .select(`
        profile_id,
        status,
        profiles (
          id,
          full_name,
          date_of_birth
        )
      `)
      .eq("church_id", churchId)
      .eq("status", "active"); // only approved members

    if (error) {
      console.error("Upcoming birthdays fetch error:", error);
      return res.status(500).json({
        error: "Failed to fetch birthdays",
      });
    }

    /* ---------------- PROCESS ---------------- */
    const upcoming = (data ?? [])
      .map((m) => {
        const dob = m.profiles?.date_of_birth;
        if (!dob) return null;

        const dobDate = new Date(dob);
        if (isNaN(dobDate)) return null;

        // build next birthday
        let nextBirthday = new Date(
          Date.UTC(
            currentYear,
            dobDate.getUTCMonth(),
            dobDate.getUTCDate()
          )
        );

        if (nextBirthday < today) {
          nextBirthday.setUTCFullYear(currentYear + 1);
        }

        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(
          diffTime / (1000 * 60 * 60 * 24)
        );

        return diffDays <= daysAhead
          ? {
              id: m.profiles.id,
              full_name: m.profiles.full_name,
              date_of_birth: m.profiles.date_of_birth,
              days_left: diffDays,
            }
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
