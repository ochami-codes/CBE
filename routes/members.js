import express from "express";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD / UPSERT MEMBER
 * POST /members
 * Expects: { full_name, department (code), phone, role_name? }
 */
router.post(
  "/",
  requireRole([
    "Admin",
    "Pastor",
    "Youth_leader",
    "Choir_leader",
    "Amo_leader",
    "Deaconry_leader",
    "Alo_leader",
  ]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;

    const {
      profile_id,
      full_name,
      phone,
      department,
      role_name = "Member",
    } = req.body;

    if (!department) {
      return res.status(400).json({ message: "Department is required" });
    }

    if (!profile_id && (!full_name || !phone)) {
      return res.status(400).json({
        message: "Provide profile_id OR full_name + phone",
      });
    }

    try {
      /* ---------------- Resolve department ---------------- */

      const { data: dept, error: deptError } = await supabase
        .from("departments")
        .select("id, type")
        .eq("church_id", church_id)
        .eq("code", department)
        .single();

      if (deptError || !dept) {
        return res.status(400).json({ message: "Invalid department" });
      }

      let profileId;

      /* ---------------- SYSTEM USER ---------------- */

      if (profile_id) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", profile_id)
          .eq("church_id", church_id)
          .single();

        if (error || !profile) {
          return res.status(404).json({ message: "Profile not found" });
        }

        profileId = profile.id;
      }

      /* ---------------- NON SYSTEM MEMBER ---------------- */

      if (!profileId) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("church_id", church_id)
          .eq("phone", phone)
          .maybeSingle();

        if (existingProfile) {
          profileId = existingProfile.id;
        } else {
          const { data: newProfile, error } = await supabase
            .from("profiles")
            .insert({
              full_name,
              phone,
              church_id,
              is_system_user: false,
            })
            .select()
            .single();

          if (error) throw error;

          profileId = newProfile.id;
        }
      }

      /* ---------------- PREVENT DUPLICATE SAME DEPARTMENT ---------------- */

      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("id", profileId)
        .eq("department_id", dept.id)
        .maybeSingle();

      if (existingMember) {
        return res.status(409).json({
          message: "Member already belongs to this department",
        });
      }

      /* ---------------- AGE DEPARTMENT CHECK ---------------- */

      if (dept.type === "age") {
        const { data: existingAgeDept } = await supabase
          .from("members")
          .select("departments(type)")
          .eq("id", profileId)
          .eq("church_id", church_id)
          .eq("departments.type", "age");

        if (existingAgeDept?.length > 0) {
          return res.status(409).json({
            message: "Member already belongs to another age department",
          });
        }
      }

      /* ---------------- CREATE MEMBER ---------------- */

      const { data: member, error } = await supabase
        .from("members")
        .insert({
          profile_id: profileId,
          church_id,
          department_id: dept.id,
          role_name,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        message: "Member added successfully",
        member,
      });
    } catch (err) {
      console.error("Add member error:", err);
      return res.status(500).json({ message: "Failed to add member" });
    }
  }
);
/**
 * UPDATE MEMBER
 */
router.put(
  "/:id",
  
  requireRole(["Admin"]),
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
  
  requireRole(["Admin", "Pastor", "Youth_leader", "Deaconry_leader", "Amo_leader", "Alo_leader", "Choir_leader"]),
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

// Search profiles
router.get("/profiles/search", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ profiles: [] });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("church_id", church_id)
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);

    if (error) throw error;

    return res.json({ profiles: data ?? [] });
  } catch (err) {
    console.error("Search profiles error:", err);
    return res.status(500).json({ message: "Failed to search users" });
  }
});

export default router;

