// routes/admin/overview.js
import express from "express";

const router = express.Router();

/**
 * GET /admin/overview
 * Returns member counts by department
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const departments = ["youth", "children", "adults"];

    const counts = {};

    for (const dept of departments) {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("department", dept);

      if (error) throw error;
      counts[dept] = count || 0;
    }

    // Optional total
    counts.total = Object.values(counts).reduce((sum, val) => sum + val, 0);

    res.json(counts);
  } catch (err) {
    console.error("Overview counts error:", err);
    res.status(500).json({ message: "Failed to fetch member counts" });
  }
});

export default router;
