// backend/routes/daily-verse.js
import express from "express";

const router = express.Router();

/**
 * GET /dashboard/daily-verse
 * Public daily verse
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_verses")
      .select("reference, text")
      .eq("verse_date", today)
      .limit(1)
      .single();

    // Ignore "row not found" error
    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // Fallback verse
    if (!data) {
      return res.json({
        reference: "Psalm 118:24",
        text:
          "This is the day the Lord has made; let us rejoice and be glad in it.",
      });
    }

    res.json(data);
  } catch (err) {
    console.error("Daily verse error:", err);
    res.status(500).json({
      error: "Failed to fetch daily verse",
    });
  }
});

export default router;
