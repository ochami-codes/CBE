// backend/routes/churches.js
import express from "express";

const router = express.Router();

/**
 * GET /churches
 * Public list of churches
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name, logo")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({ churches: data ?? [] });
  } catch (err) {
    console.error("Fetch churches error:", err);
    res.status(500).json({ message: "Failed to load churches" });
  }
});

/**
 * GET /churches/:id
 * Fetch a single church (for dashboard, profile, etc.)
 */
router.get("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name, logo")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Fetch church by id error:", err);
    res.status(500).json({ message: "Failed to load church" });
  }
});

export default router;
