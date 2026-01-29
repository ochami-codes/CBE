// backend/routes/announcements.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* --------------------------------------------------
   GET /announcements
   Query params: churchId, limit (optional, default 5)
-------------------------------------------------- */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { churchId, limit = 5 } = req.query;

  if (!churchId) return res.status(400).json({ error: "churchId is required" });

  try {
    // 1️⃣ Get Communication department ID
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id")
      .eq("name", "Communication")
      .eq("church_id", churchId)
      .single();

    if (deptError || !dept) {
      console.error("Department fetch error:", deptError);
      return res.status(500).json({ error: "Communication department not found" });
    }

    // 2️⃣ Get announcements
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("department_id", dept.id)
      .eq("church_id", churchId)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json(data ?? []);
  } catch (err) {
    console.error("Announcements fetch error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/* --------------------------------------------------
   POST /announcements
   Body: { title, message, churchId }
   Requires auth
-------------------------------------------------- */
router.post("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { title, message, churchId } = req.body;
  const { id: userId } = req.user;

  if (!title || !message || !churchId) {
    return res.status(400).json({ error: "title, message, and churchId are required" });
  }

  try {
    // Get Communication department ID
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id")
      .eq("name", "Communication")
      .eq("church_id", churchId)
      .single();

    if (deptError || !dept) {
      return res.status(500).json({ error: "Communication department not found" });
    }

    // Insert announcement
    const { data, error } = await supabase
      .from("announcements")
      .insert([
        {
          title,
          message,
          church_id: churchId,
          department_id: dept.id,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

/* --------------------------------------------------
   DELETE /announcements/:id
   Requires auth
-------------------------------------------------- */
router.delete("/:id", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;

  try {
    // Optionally, check if the user is allowed to delete (admin or department member)
    const { data: deleted, error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!deleted || deleted.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
