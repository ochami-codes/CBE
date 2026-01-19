// backend/routes/dashboard/todaysBirthdays.js
import express from "express";
import { supabase } from "../../supabaseClient.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET /dashboard/todays-birthdays
router.get("/", authMiddleware, async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const today = new Date();
    const month = today.getMonth() + 1; // JS months are 0-based
    const day = today.getDate();

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, date_of_birth")
      .eq("church_id", churchId)
      .ilike("date_of_birth", `%-${month.toString().padStart(2,"0")}-${day.toString().padStart(2,"0")}%`);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
