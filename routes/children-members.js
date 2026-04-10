// backend/routes/children-members.js
import express from "express";

const router = express.Router();

/**
 * GET /children
 * List all children for current user's church
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  if (!church_id) {
    return res.status(400).json({ error: "Church not set" });
  }

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("church_id", church_id)
      .order("full_name", { ascending: true });

    if (error) throw error;

    res.json({ children: data ?? [] });
  } catch (err) {
    console.error("Fetch children error:", err);
    res.status(500).json({ error: "Failed to fetch children" });
  }
});

/**
 * GET /children/:id
 */
router.get("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { church_id } = req.user;

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("id", id)
      .eq("church_id", church_id) // 🔒 prevent cross-church access
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Child not found" });
    }

    res.json({ child: data });
  } catch (err) {
    console.error("Fetch child error:", err);
    res.status(500).json({ error: "Failed to fetch child" });
  }
});

/**
 * POST /children
 */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { permissions, church_id, is_member } = req.user;

  // 🔒 Must be member
  if (!is_member) {
    return res.status(403).json({ error: "Members only" });
  }

  // 🔒 Permission check
  if (!permissions.includes("manage_children")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const {
    full_name,
    parent_name,
    parent_phone,
    date_of_birth,
    gender,
  } = req.body;

  if (!full_name || !parent_name || !parent_phone || !date_of_birth || !gender) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const { data, error } = await supabase
      .from("children")
      .insert({
        full_name,
        parent_name,
        parent_phone,
        date_of_birth,
        gender,
        church_id, // ✅ from auth, not client
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ child: data });
  } catch (err) {
    console.error("Add child error:", err);
    res.status(500).json({ error: "Failed to add child" });
  }
});

/**
 * PUT /children/:id
 */
router.put("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { permissions, church_id, is_member } = req.user;
  const updates = req.body;

  if (!is_member) {
    return res.status(403).json({ error: "Members only" });
  }

  if (!permissions.includes("manage_children")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { data, error } = await supabase
      .from("children")
      .update(updates)
      .eq("id", id)
      .eq("church_id", church_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Child not found or update failed" });
    }

    res.json({ child: data });
  } catch (err) {
    console.error("Update child error:", err);
    res.status(500).json({ error: "Failed to update child" });
  }
});

/**
 * DELETE /children/:id
 */
router.delete("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { permissions, church_id, is_member } = req.user;

  if (!is_member) {
    return res.status(403).json({ error: "Members only" });
  }

  if (!permissions.includes("manage_children")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { data, error } = await supabase
      .from("children")
      .delete()
      .eq("id", id)
      .eq("church_id", church_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Child not found or delete failed" });
    }

    res.json({ message: "Child deleted successfully", child: data });
  } catch (err) {
    console.error("Delete child error:", err);
    res.status(500).json({ error: "Failed to delete child" });
  }
});

export default router;
