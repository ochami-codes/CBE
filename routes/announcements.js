import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* --------------------------------------------------
   Helper: Get or create Communication department
-------------------------------------------------- */
async function getCommunicationDepartment(supabase, churchId) {
  // Try fetch
  let { data: dept, error } = await supabase
    .from("departments")
    .select("id")
    .eq("church_id", churchId)
    .ilike("name", "communication")
    .maybeSingle(); // ✅ prevents PGRST116

  if (error) throw error;

  // Create if missing
  if (!dept) {
    const { data: created, error: createError } = await supabase
      .from("departments")
      .insert({
        name: "Communication",
        church_id: churchId,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    dept = created;
  }

  return dept;
}

/* --------------------------------------------------
   GET /announcements
   Query params: churchId, limit (optional, default 5)
-------------------------------------------------- */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { churchId, limit = 5 } = req.query;

  if (!churchId) {
    return res.status(400).json({ error: "churchId is required" });
  }

  try {
    const dept = await getCommunicationDepartment(supabase, churchId);

    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("church_id", churchId)
      .eq("department_id", dept.id)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json(data || []);
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
  const userId = req.user?.id;

  if (!title || !message || !churchId) {
    return res
      .status(400)
      .json({ error: "title, message, and churchId are required" });
  }

  try {
    const dept = await getCommunicationDepartment(supabase, churchId);

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title,
        message,
        church_id: churchId,
        department_id: dept.id,
        created_by: userId,
      })
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
    const { data, error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
