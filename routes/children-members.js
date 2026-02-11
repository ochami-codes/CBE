// backend/routes/children-members.js
import express from "express";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * GET /children
 * List all children for a church
 * Query param: churchId
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { churchId } = req.query;

  if (!churchId) {
    return res.status(400).json({ error: "churchId is required" });
  }

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("church_id", churchId)
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
 * Get single child by ID
 */
router.get("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("id", id)
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
 * Add new child
 */
router.post(
  "/",
  
  requireRole(["admin", "children_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { full_name, parent_name, parent_phone, date_of_birth, gender, church_id } = req.body;

    if (!full_name || !parent_name || !parent_phone || !date_of_birth || !gender || !church_id) {
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
          church_id,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ child: data });
    } catch (err) {
      console.error("Add child error:", err);
      res.status(500).json({ error: "Failed to add child" });
    }
  }
);

/**
 * PUT /children/:id
 * Update child info
 */
router.put(
  "/:id",
  
  requireRole(["admin", "children_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const updates = req.body;

    try {
      const { data, error } = await supabase
        .from("children")
        .update(updates)
        .eq("id", id)
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
  }
);

/**
 * DELETE /children/:id
 * Remove child
 */
router.delete(
  "/:id",
  
  requireRole(["admin", "children_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;

    try {
      const { data, error } = await supabase
        .from("children")
        .delete()
        .eq("id", id)
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
  }
);

export default router;
