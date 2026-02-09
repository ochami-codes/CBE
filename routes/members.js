import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD MEMBER
 * POST /members
 * Expects: { full_name, department (code), email?, role_name? }
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["Admin", "Pastor", "Youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;
    const { full_name, department, email, role_name = "Member" } = req.body;

    if (!full_name || !department) {
      return res.status(400).json({ message: "full_name and department are required" });
    }

    try {
      // ----------------- Resolve department -----------------
      const { data: dept, error: deptError } = await supabase
        .from("departments")
        .select("id")
        .eq("church_id", church_id)
        .eq("code", department)
        .single();

      if (deptError || !dept) {
        return res.status(400).json({ message: "Invalid department" });
      }

      let member;

      if (email) {
        // ----------------- Check profile by email -----------------
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (profileError && profileError.code !== "PGRST116") throw profileError;

        if (profile) {
          // Profile exists, check if member exists
          const { data: existingMember } = await supabase
            .from("members")
            .select("*")
            .eq("church_id", church_id)
            .eq("profile_id", profile.id)
            .single();

          if (existingMember) {
            // Update existing member
            const { data: updatedMember, error: updateError } = await supabase
              .from("members")
              .update({
                full_name,
                department_id: dept.id,
                role_name,
                active: true,
              })
              .eq("id", existingMember.id)
              .select()
              .single();

            if (updateError) throw updateError;
            member = updatedMember;
          } else {
            // Insert new member linked to profile
            const { data: newMember, error: insertError } = await supabase
              .from("members")
              .insert({
                full_name,
                department_id: dept.id,
                role_name,
                church_id,
                profile_id: profile.id,
                active: true,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            member = newMember;
          }
        } else {
          // Profile not found, insert member without profile
          const { data: newMember, error: insertError } = await supabase
            .from("members")
            .insert({
              full_name,
              department_id: dept.id,
              role_name,
              church_id,
              active: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          member = newMember;
        }
      } else {
        // No email, insert normally
        const { data: newMember, error: insertError } = await supabase
          .from("members")
          .insert({
            full_name,
            department_id: dept.id,
            role_name,
            church_id,
            active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        member = newMember;
      }

      return res.status(201).json({ message: "Member added successfully", member });
    } catch (err) {
      console.error("Add member error:", err);
      return res.status(500).json({ message: "Failed to add member" });
    }
  }
);

/**
 * GET MEMBERS
 * Optional query: department (frontend code, e.g. "youth")
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { department } = req.query;

  try {
    let query = supabase
      .from("member_full") // view joins members + departments + profiles
      .select("*")
      .eq("church_id", church_id)
      .order("created_at", { ascending: false });

    if (department) {
      const { data: dept, error: deptError } = await supabase
        .from("departments")
        .select("id")
        .eq("church_id", church_id)
        .eq("code", department)
        .single();

      if (deptError || !dept) {
        return res.status(400).json({ message: "Invalid department" });
      }

      query = query.eq("department_id", dept.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const members = (data ?? []).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      department: department ?? m.department_code,
      department_name: m.department_name,
      role_name: m.role_name,
      active: m.active,
      created_at: m.created_at,
      email: m.email ?? null,
      phone: m.phone ?? null,
      date_of_birth: m.date_of_birth ?? null,
      gender: m.gender ?? null,
    }));

    return res.json({ members });
  } catch (err) {
    console.error("Fetch members error:", err);
    return res.status(500).json({ message: "Failed to fetch members" });
  }
});

/**
 * UPDATE MEMBER
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole(["Admin", "Pastor", "Youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { church_id } = req.user;
    const { full_name, department, role_name, email } = req.body;

    if (!full_name && !department && !role_name && !email) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    try {
      const updatePayload = {};

      if (full_name) updatePayload.full_name = full_name;
      if (role_name) updatePayload.role_name = role_name;

      // Resolve department_id if department code provided
      if (department) {
        const { data: dept, error: deptError } = await supabase
          .from("departments")
          .select("id")
          .eq("church_id", church_id)
          .eq("code", department)
          .single();

        if (deptError || !dept) return res.status(400).json({ message: "Invalid department" });

        updatePayload.department_id = dept.id;
      }

      // Resolve profile_id if email provided
      if (email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (profile) updatePayload.profile_id = profile.id;
      }

      const { error } = await supabase
        .from("members")
        .update(updatePayload)
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      return res.json({ message: "Member updated successfully" });
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

      return res.json({ message: "Member removed successfully" });
    } catch (err) {
      console.error("Delete member error:", err);
      return res.status(500).json({ message: "Failed to remove member" });
    }
  }
);

export default router;
