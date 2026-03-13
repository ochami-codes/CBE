// backend/routes/departments.js
import express from "express";

const router = express.Router();

/**
 * GET /departments
 * Fetch all departments for the church
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  try {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code, type")
      .eq("church_id", church_id)
      .order("name", { ascending: true });

    if (error) throw error;

    return res.json({
      departments: data ?? [],
    });
  } catch (err) {
    console.error("Fetch departments error:", err);
    return res.status(500).json({
      message: "Failed to fetch departments",
    });
  }
});

export default router;
