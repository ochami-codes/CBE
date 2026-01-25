import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD MEMBER
 * POST /members
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;
    const { full_name, department, ...rest } = req.body;

    if (!full_name || !department) {
      return res.status(400).json({
        message: "Full name and department are required",
      });
    }

    try {
      const { error } = await supabase
        .from("members")
        .insert({
          full_name,
          department,
          church_id,
          ...rest,
        });

      if (error) throw error;

      res.status(201).json({
        message: "Member added successfully",
      });
    } catch (err) {
      console.error("Add member error:", err);
      res.status(500).json({
        message: "Failed to add member",
      });
    }
  }
);

/**
 * GET MEMBERS
 * GET /members?department=Youth
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { department } = req.query;

  try {
    let query = supabase
      .from("members")
      .select("*")
      .eq("church_id", church_id)
      .order("created_at", { ascending: false });

    if (department) {
      query = query.eq("department", department);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ members: data });
  } catch (err) {
    console.error("Fetch members error:", err);
    res.status(500).json({
      message: "Failed to fetch members",
    });
  }
);

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
    const { updates } = req.body;
    const { church_id } = req.user;

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        message: "Invalid update payload",
      });
    }

    try {
      const { error } = await supabase
        .from("members")
        .update(updates)
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      res.json({
        message: "Member updated successfully",
      });
    } catch (err) {
      console.error("Update member error:", err);
      res.status(500).json({
        message: "Failed to update member",
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
    const { church_id } = req.user;

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      res.json({
        message: "Member deleted successfully",
      });
    } catch (err) {
      console.error("Delete member error:", err);
      res.status(500).json({
        message: "Failed to delete member",
      });
    }
  }
);

export default router;
