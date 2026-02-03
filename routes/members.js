import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD MEMBER
 * POST /members
 * members.id === profiles.id
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["Admin", "Pastor", "Youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;

    const {
      id, // 👈 this is profiles.id
      full_name,
      department,
      role_name = "Member",
    } = req.body;

    if (!id || !full_name || !department) {
      return res.status(400).json({
        message: "id, full_name and department are required",
      });
    }

    try {
      const { error } = await supabase.from("members").insert({
        id,
        full_name,
        department,
        role_name,
        church_id,
        active: true,
      });

      if (error) throw error;

      return res.status(201).json({
        message: "Member added successfully",
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
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { department } = req.query;

  try {
    let query = supabase
      .from("members")
      .select(`
        id,
        full_name,
        department,
        role_name,
        active,
        created_at,
        profiles (
          email
        )
      `)
      .eq("church_id", church_id)
      .order("created_at", { ascending: false });

    // ✅ Partial & case-insensitive match
    if (department) {
      query = query.ilike("department", `%${department}%`);
    }

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
 * UPDATE MEMBER (safe fields only)
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole(["Admin", "Pastor", "Youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { church_id } = req.user;
    const { full_name, department } = req.body;

    if (!full_name && !department) {
      return res.status(400).json({
        message: "Nothing to update",
      });
    }

    try {
      const { error } = await supabase
        .from("members")
        .update({
          ...(full_name && { full_name }),
          ...(department && { department }),
        })
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      return res.json({
        message: "Member updated successfully",
      });
    } catch (err) {
      console.error("Update member error:", err);
      return res.status(500).json({
        message: "Failed to update member",
      });
    }
  }
);

/**
 * DELETE MEMBER (authority only, identity remains)
 */
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["Admin", "Pastor", "Youth_leader"]),
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

      return res.json({
        message: "Member removed successfully",
      });
    } catch (err) {
      console.error("Delete member error:", err);
      return res.status(500).json({
        message: "Failed to remove member",
      });
    }
  }
);

export default router;
