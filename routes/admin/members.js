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
    const { full_name, department, email, profile_id, role_id } = req.body;

    if (!full_name || !department) {
      return res.status(400).json({ message: "Full name and department are required" });
    }

    try {
      const { error } = await supabase.from("members").insert({
        full_name,
        department,
        email: email || null,
        church_id,
        profile_id: profile_id || null,
        role_id: role_id || null,
        active: true,
      });

      if (error) throw error;

      return res.status(201).json({ message: "Member added successfully" });
    } catch (err) {
      console.error("Add member error:", err);
      return res.status(500).json({ message: "Failed to add member" });
    }
  }
);

/**
 * GET MEMBERS
 * GET /members?department=Youth&search=Ian&page=1&pageSize=10
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { department = "", search = "", page = 1, pageSize = 10 } = req.query;

  const from = (page - 1) * pageSize;
  const to = from + Number(pageSize) - 1;

  try {
    let query = supabase
      .from("members")
      .select(
        `
        id,
        full_name,
        department,
        email,
        active,
        role_id,
        profile_id,
        profiles (
          roles (name)
        )
      `,
        { count: "exact" }
      )
      .eq("church_id", church_id)
      .range(from, to);

    if (search) query = query.ilike("full_name", `%${search}%`);
    if (department) query = query.eq("department", department);

    const { data, error, count } = await query;
    if (error) throw error;

    const members = (data || []).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      department: m.department,
      email: m.email,
      active: m.active ?? true,
      role_name: m.profiles?.roles?.name ?? "Member",
    }));

    return res.json({ members, total: count, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    console.error("Fetch members error:", err);
    return res.status(500).json({ message: "Failed to fetch members" });
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
      return res.status(400).json({
        message: "Invalid update payload",
      });
    }

    try {
      // 1️⃣ Fetch the member to see if it's linked to a profile
      const { data: member, error: fetchError } = await supabase
        .from("members")
        .select("id, profile_id")
        .eq("id", id)
        .eq("church_id", church_id)
        .single();

      if (fetchError || !member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // 2️⃣ If member has a linked profile and role_id is being updated, update profiles table
      if (member.profile_id && "role_id" in updates) {
        const { role_id } = updates;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role_id })
          .eq("id", member.profile_id);

        if (profileError) throw profileError;

        // Remove role_id from updates to avoid updating members table
        delete updates.role_id;
      }

      // 3️⃣ Update remaining fields in members table
      if (Object.keys(updates).length > 0) {
        const { error: memberError } = await supabase
          .from("members")
          .update(updates)
          .eq("id", id)
          .eq("church_id", church_id);

        if (memberError) throw memberError;
      }

      return res.json({ message: "Member updated successfully" });
    } catch (err) {
      console.error("Update member error:", err);
      return res.status(500).json({
        message: "Failed to update member",
      });
    }
  }
);
/**
 * UPDATE MEMBER ROLE
 * PUT /members/:id/role
 */
router.put(
  "/:id/role",
  authMiddleware,
  requireRole(["Admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;               // member id
    const { role_id } = req.body;            // frontend sends { role_id: "xyz" }
    const { church_id } = req.user;

    if (!role_id) {
      return res.status(400).json({ message: "role_id is required" });
    }

    try {
      // 1️⃣ Get the profile_id linked to this member
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("profile_id")
        .eq("id", id)
        .eq("church_id", church_id)
        .single();

      if (memberError || !member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // 2️⃣ Update the role_id in the profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role_id })
        .eq("id", member.profile_id);

      if (updateError) throw updateError;

      return res.json({ message: "Member role updated successfully" });
    } catch (err) {
      console.error("Update member role error:", err);
      return res.status(500).json({
        message: "Failed to update member role",
      });
    }
  }
);
/**
 * DELETE MEMBER
 * DELETE /members/:id
 */
router.delete("/:id", authMiddleware, requireRole(["Admin"]), async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { church_id } = req.user;

  try {
    const { error } = await supabase.from("members").delete().eq("id", id).eq("church_id", church_id);
    if (error) throw error;

    return res.json({ message: "Member deleted successfully" });
  } catch (err) {
    console.error("Delete member error:", err);
    return res.status(500).json({ message: "Failed to delete member" });
  }
});

export default router;
