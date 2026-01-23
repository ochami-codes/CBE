// backend/routes/announcements.js
import express from "express";

const router = express.Router();

/**
 * GET /announcements
 * Query params: churchId, limit (optional, default 5)
 * Returns latest announcements for the Communication department of a church
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { churchId, limit = 5 } = req.query;

  if (!churchId) {
    return res.status(400).json({ error: "churchId is required" });
  }

  try {
    // 1️⃣ Fetch Communication department ID
    const { data: communicationDept, error: deptError } = await supabase
      .from("departments")
      .select("id")
      .eq("name", "Communication")
      .eq("church_id", churchId)
      .single();

    if (deptError || !communicationDept) {
      console.error("Department fetch error:", deptError);
      return res.status(500).json({ error: "Communication department not found" });
    }

    // 2️⃣ Fetch latest announcements
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("church_id", churchId)
      .eq("department_id", communicationDept.id)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json(data ?? []);
  } catch (err) {
    console.error("Announcements fetch error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

export default router;
