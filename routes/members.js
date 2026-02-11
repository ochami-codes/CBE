import express from "express";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD / UPSERT MEMBER
 * POST /members
 * Expects: { full_name, department (code), email?, role_name? }
 */
router.post(
  "/",
  
  requireRole(["Admin", "Pastor", "Youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;
    const { full_name, department, email, role_name = "Member" } = req.body;

    if (!full_name || !department) {
      return res.status(400).json({ message: "full_name and department are required" });
    }

    try {
      /* ---------------- Resolve department ---------------- */
      const { data: dept } = await supabase
        .from("departments")
        .select("id")
        .eq("church_id", church_id)
        .eq("code", department)
        .single();

      if (!dept) {
        return res.status(400).json({ message: "Invalid department" });
      }

      let profileId;

      /* ---------------- Resolve or create PROFILE ---------------- */
      if (email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (profile) {
          profileId = profile.id;

          // keep profile data fresh
          await supabase
            .from("profiles")
            .update({ full_name, church_id })
            .eq("id", profileId);
        } else {
          const { data: newProfile, error } = await supabase
            .from("profiles")
            .insert({
              email,
              full_name,
              church_id,
              is_system_user: false,
            })
            .select()
            .single();

          if (error) throw error;
          profileId = newProfile.id;
        }
      } else {
        // no email → create anonymous profile
        const { data: newProfile, error } = await supabase
          .from("profiles")
          .insert({
            full_name,
            church_id,
            is_system_user: false,
          })
          .select()
          .single();

        if (error) throw error;
        profileId = newProfile.id;
      }

      /* ---------------- Upsert MEMBER (id = profileId) ---------------- */
      const { data: member, error } = await supabase
        .from("members")
        .upsert(
          {
            id: profileId,
            church_id,
            department_id: dept.id,
            role_name,
            active: true,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        message: "Member saved successfully",
        member,
      });
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
router.get("/", async (req, res) => {
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
