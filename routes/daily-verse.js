// backend/routes/daily-verse.js
import express from "express";

const router = express.Router(); // ⚡ This defines router

/**
 * GET /dashboard/daily-verse
 * Returns today's verse, with fallback if not found
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from("daily_verses")
      .select("reference, text")
      .eq("verse_date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    res.json(
      data || {
        reference: "Psalm 118:24",
        text:
          "This is the day the Lord has made; let us rejoice and be glad in it.",
      }
    );
  } catch (err) {
    console.error("Daily verse error:", err);
    res.status(500).json({
      message: "Failed to fetch daily verse",
    });
  }
});

export default router; // ⚡ Export router so app.js can use it
