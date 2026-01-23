// backend/routes/members.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * Map departments to tables
 * (single source of truth)
 */
const DEPARTMENT_TABLES = {
  youth: "youth_members",
  children: "children_members",
};

/**
 * Helper: resolve department table
 */
function getDepartmentTable(department) {
  return DEPARTMENT_TABLES[department] || null;
}

/**
 * ADD MEMBER
 * POST /members
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder", "youth_leader", "children_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { department, data } = req.body;
    const { church_id } = req.user;

    const table = getDepartmentTable(department);
    if (!table) {
      return res.status(400).json({ error: "Invalid department" });
    }

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid member data" });
    }

    try {
      const payload = {
        ...data,
        church_id,
      };

      const { error } = await supabase.from(table).insert(payload);

      if (error) throw error;

      res.status(201).json({
        message: "Member added successfully",
      });
    } catch (err) {
      console.error("Add member error:", err);
      res.status(500).json({
        error: "Failed to add member",
      });
    }
  }
);

/**
 * GET MEMBERS
 * GET /members?department=youth
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { department } = req.query;
  const { church_id } = req.user;

  const table = getDepartmentTable(department);
  if (!table) {
    return res.status(400).json({ error: "Invalid department" });
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("church_id", church_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ members: data });
  } catch (err) {
    console.error("Fetch members error:", err);
    res.status(500).json({
      error: "Failed to fetch members",
    });
  }
});

/**
 * UPDATE MEMBER
 * PUT /members/:id
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole(["admin", "pastor", "elder"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { department, updates } = req.body;
    const { church_id } = req.user;

    const table = getDepartmentTable(department);
    if (!table) {
      return res.status(400).json({ error: "Invalid department" });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "Invalid update payload" });
    }

    try {
      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      res.json({ message: "Member updated successfully" });
    } catch (err) {
      console.error("Update member error:", err);
      res.status(500).json({
        error: "Failed to update member",
      });
    }
  }
);

/**
 * DELETE MEMBER
 * DELETE /members/:id
 */
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { department } = req.body;
    const { church_id } = req.user;

    const table = getDepartmentTable(department);
    if (!table) {
      return res.status(400).json({ error: "Invalid department" });
    }

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      res.json({ message: "Member deleted successfully" });
    } catch (err) {
      console.error("Delete member error:", err);
      res.status(500).json({
        error: "Failed to delete member",
      });
    }
  }
);

export default router;
