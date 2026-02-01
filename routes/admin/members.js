// backend/routes/admin/members.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

/**
 * GET /admin/members
 * Query params: search, department, page, pageSize
 * Returns paginated members list with role info
 */
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  const {
    search = "",
    department = "",
    page = 1,
    pageSize = 10,
  } = req.query;

  const from = (page - 1) * pageSize;
  const to = from + Number(pageSize) - 1;

  try {
    let query = supabase
      .from("members")
      .select(
        `
        id,
        full_name,
        email,
        department,
        active,
        role_name
      `,
        { count: "exact" }
      )
      .eq("church_id", church_id)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("full_name", `%${search}%`);
    if (department) query = query.eq("department", department);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      members: data || [],
      total: count || 0,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (err) {
    console.error("GET /admin/members error:", err);
    res.status(500).json({ message: "Failed to fetch members" });
  }
});

/**
 * PUT /admin/members/:id/role
 * Update a member's role
 */
router.put("/:id/role", authMiddleware, requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { role_name } = req.body;
  const { church_id } = req.user;

  if (!role_name) {
    return res.status(400).json({ message: "role_name is required" });
  }

  try {
    const { error } = await supabase
      .from("members")
      .update({ role_name })
      .eq("id", id)
      .eq("church_id", church_id);

    if (error) throw error;

    res.json({ message: "Member role updated successfully" });
  } catch (err) {
    console.error("PUT /members/:id/role error:", err);
    res.status(500).json({ message: "Failed to update member role" });
  }
});

/**
 * POST /admin/members/:id/deactivate
 * Deactivate a member
 */
router.post("/:id/deactivate", authMiddleware, requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { church_id } = req.user;

  try {
    const { error } = await supabase
      .from("members")
      .update({ active: false })
      .eq("id", id)
      .eq("church_id", church_id);

    if (error) throw error;

    res.json({ message: "Member deactivated successfully" });
  } catch (err) {
    console.error("POST /members/:id/deactivate error:", err);
    res.status(500).json({ message: "Failed to deactivate member" });
  }
});

export default router;
