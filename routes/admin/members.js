import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD MEMBER
 * POST /members
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["Admin"]),
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
      const { data, error } = await supabase
        .from("members")
        .insert({ full_name, department, church_id, ...rest })
        .select()
        .single(); // return the created row

      if (error) throw error;

      return res.status(201).json({
        message: "Member added successfully",
        member: data,
      });
    } catch (err) {
      console.error("Add member error:", err);
      return res.status(500).json({
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

    if (department) query = query.eq("department", department);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ members: data });
  } catch (err) {
    console.error("Fetch members error:", err);
    return res.status(500).json({
      message: "Failed to fetch members",
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
  requireRole(["Admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { updates } = req.body;
    const { church_id } = req.user;

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ message: "Invalid update payload" });
    }

    try {
      // Update and return the updated member row
      const { data, error } = await supabase
        .from("members")
        .update(updates)
        .eq("id", id)
        .eq("church_id", church_id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        message: "Member updated successfully",
        member: data, // <-- send back updated member
      });
    } catch (err) {
      console.error("Update member error:", err);
      return res.status(500).json({ message: "Failed to update member" });
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
  requireRole(["Admin"]),
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

      return res.json({ message: "Member deleted successfully" });
    } catch (err) {
      console.error("Delete member error:", err);
      return res.status(500).json({ message: "Failed to delete member" });
    }
  }
);

export default router;
