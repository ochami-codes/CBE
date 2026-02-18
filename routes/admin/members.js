import express from "express";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD MEMBER
 * POST /members
 * members.id === profiles.id
 */
router.post(
  "/",
  
  requireRole(["Admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;
    const { id, full_name, department, role_name = "Member" } = req.body;

    if (!id || !full_name || !department) {
      return res.status(400).json({
        message: "id (from profiles), full_name, and department are required",
      });
    }

    try {
      const { data, error } = await supabase
        .from("members")
        .insert({
          id, // 👈 ensures linkage to profiles
          full_name,
          department,
          role_name,
          church_id,
          active: true,
        })
        .select()
        .single();

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
 */
router.get("/", async (req, res) => {
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
        profiles!members_id_fkey (email)
      `)
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
 */
router.put(
  "/:id",
  
  requireRole(["Admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { full_name, department, role_name, active } = req.body;
    const { church_id } = req.user;

    if (!full_name && !department && !role_name && active === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    try {
      const { data, error } = await supabase
        .from("members")
        .update({
          ...(full_name && { full_name }),
          ...(department && { department }),
          ...(role_name && { role_name }),
          ...(active !== undefined && { active }),
        })
        .eq("id", id)
        .eq("church_id", church_id)
        .select()
        .single();

      if (error) throw error;

      return res.json({ message: "Member updated successfully", member: data });
    } catch (err) {
      console.error("Update member error:", err);
      return res.status(500).json({ message: "Failed to update member" });
    }
  }
);

/**
 * DELETE MEMBER
 */
router.delete(
  "/:id",
  
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

      return res.json({ message: "Member removed successfully" });
    } catch (err) {
      console.error("Delete member error:", err);
      return res.status(500).json({ message: "Failed to remove member" });
    }
  }
);

export default router;
