// routes/admin/members.js
import express from "express";

const router = express.Router();

/**
 * Add a new member
 * POST /admin/members/add
 * body: { table, data }
 */
router.post("/add",  async (req, res) => {
  const { table, data } = req.body;

  if (!table || !data) {
    return res.status(400).json({ message: "Missing table or data" });
  }

  try {
    const { error } = await req.supabase.from(table).insert([data]);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get all members for a table/department
 * GET /admin/members?table=members
 */
router.get("/", async (req, res) => {
  const table = req.query.table;
  if (!table) return res.status(400).json({ message: "Missing table query param" });

  try {
    const { data, error } = await req.supabase.from(table).select("*").order("created_at", { ascending: false });
    if (error) throw error;

    res.json({ members: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get single member by ID
 * GET /admin/members/:id
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await req.supabase.from("members").select("*").eq("id", id).single();
    if (error) throw error;

    res.json({ member: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Update member by ID
 * PUT /admin/members/:id
 * body: { updates }
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body.updates;

  if (!updates) return res.status(400).json({ message: "Missing updates in request body" });

  try {
    const { error } = await req.supabase.from("members").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Delete member by ID
 * DELETE /admin/members/:id
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await req.supabase.from("members").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
