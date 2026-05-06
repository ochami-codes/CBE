// backend/routes/dashboard/todaysBirthdays.js
import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;

  const churchId = user?.active_church_id;

  if (!churchId) {
    return res.status(401).json({ error: "No active church selected" });
  }

  try {
    const today = new Date();
    const month = today.getUTCMonth();
    const date = today.getUTCDate();

    /* ---------------- FETCH MEMBERS IN CHURCH ---------------- */
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
      .eq("status", "active"); // only real members

    if (error) {
      console.error("Today's birthdays error:", error);
      return res.status(500).json({ error: "Failed to fetch birthdays" });
    }

    /* ---------------- FILTER TODAY ---------------- */
    const todaysBirthdays = (data ?? []).filter((m) => {
      const dob = m.profiles?.date_of_birth;
      if (!dob) return false;

      const dateObj = new Date(dob);
      if (isNaN(dateObj)) return false;

      return (
        dateObj.getUTCMonth() === month &&
        dateObj.getUTCDate() === date
      );
    });

    /* ---------------- FORMAT ---------------- */
    const result = todaysBirthdays.map((m) => ({
      id: m.profiles.id,
      full_name: m.profiles.full_name,
      date_of_birth: m.profiles.date_of_birth,
    }));

    res.json(result);

  } catch (err) {
    console.error("Today's birthdays route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
