// routes/dailyVerse.js
import express from "express";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_verses")
      .select("reference, text")
      .eq("verse_date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: error.message });
    }

    // If no verse for today
    if (!data) {
      return res.json({
        reference: "Psalm 118:24",
        text: "This is the day the Lord has made; let us rejoice and be glad in it."
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch daily verse" });
  }
});

export default router;
