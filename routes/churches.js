// backend/routes/churches.js
import express from "express";

const router = express.Router();

/**
 * GET /churches
 * Public list of churches + optional search
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { search } = req.query;

  try {
    let query = supabase
      .from("churches")
      .select("id, name, church_code, logo")
      .order("name", { ascending: true });

    // ---------------- SEARCH LOGIC ----------------
    if (search && search.trim()) {
      const term = search.trim();

      query = query.ilike("name", `%${term}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json({
      churches: data ?? [],
    });
  } catch (err) {
    console.error("Fetch churches error:", err);
    return res.status(500).json({
      message: "Failed to load churches",
    });
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
