import express from "express";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD MEMBER
 * POST /members
 * Only store profile_id, church_id, role_name, department, active
 */
router.post(
  "/",
  requireRole(["Admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;
    const { profile_id, department, role_name = "Member" } = req.body;

    if (!profile_id || !department) {
      return res.status(400).json({
        message: "profile_id (from profiles) and department are required",
      });
    }

    try {
      const { data, error } = await supabase
        .from("members")
        .insert({
          profile_id,
          church_id,
          department,
          role_name,
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
      return res.status(500).json({ message: "Failed to add member" });
    }
  }
);

/**
 * GET MEMBERS
 * Join members + profiles directly (avoid misleading view data)
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
        profile_id,
        role_name,
        active,
        department,
        created_at,
        profiles!inner (
          full_name,
          email,
          church_id
        )
      `)
      .eq("church_id", church_id)
      .order("full_name", {
  ascending: true,
  foreignTable: "profiles",
});

    if (department) {
      query = query.eq("department", department);
    }

    const { data, error } = await query;

    if (error) throw error;

    /* Normalize response */
    const members = (data || []).map(m => ({
      id: m.id,
      profile_id: m.profile_id,
      full_name: m.profiles?.full_name || null,
      email: m.profiles?.email || null,
      department: m.department,
      role_name: m.role_name,
      active: m.active,
      created_at: m.created_at,
    }));

    return res.json({ members });

  } catch (err) {
    console.error("Fetch members error:", err);
    return res.status(500).json({
      message: "Failed to fetch members",
    });
  }
});
/**
 * UPDATE MEMBER
 * Only update church-specific fields
 */
router.put("/:id", requireRole(["Admin"]), async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params; // member.id
  const { department, role_name, active } = req.body;
  const { church_id } = req.user;

  if (!department && !role_name && active === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const { data, error } = await supabase
      .from("members")
      .update({
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
});

/**
 * DELETE MEMBER
 */
router.delete("/:id", requireRole(["Admin"]), async (req, res) => {
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
});

export default router;
