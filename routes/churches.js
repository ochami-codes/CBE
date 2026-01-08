// routes/churches.js
import express from "express";

const router = express.Router();

// GET /churches (public)
router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;

    const { data, error } = await supabase
      .from("churches")
      .select("id, name, logo")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Fetch churches error:", err);
    res.status(500).json({ message: "Failed to load churches" });
  }
});

export default router;
