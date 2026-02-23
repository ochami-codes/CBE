// routes/conferences.js
import express from "express";

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM conferences ORDER BY name ASC"
    );

    res.json({
      conferences: result.rows || [],
    });

  } catch (err) {
    console.error("Fetch conferences error:", err);

    res.status(500).json({
      message: "Failed to fetch conferences",
      conferences: [],
    });
  }
});
export default router;
