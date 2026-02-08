// backend/routes/members.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();
// DB label → frontend code
const DEPARTMENT_MAP = {
  "Children": "children",
  "Youth/Ambassadors": "youth",
  "Treasury": "treasury",
  "Communication": "communication",
  "Sabbath School": "sabbath_school",
};
/**
 * ADD MEMBER
 * POST /members
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["Admin", "Pastor", "Youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;

    const { full_name, department, role_name = "Member" } = req.body;

    if (!full_name || !department) {
      return res.status(400).json({ message: "full_name and department are required" });
    }

    try {
      const { data, error } = await supabase
        .from("members")
        .insert({
          full_name,
          department,
          role_name,
          church_id,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ message: "Member added successfully", member: data });
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
      .from("member_full") // view with flattened profile fields
      .select("*")
      .eq("church_id", church_id)
      .order("created_at", { ascending: false });

    /**
     * If frontend sends ?department=youth
     * convert it back to DB label for filtering
     */
    if (department) {
      const dbDepartment = Object.entries(DEPARTMENT_MAP)
        .find(([, code]) => code === department)?.[0];

      if (dbDepartment) {
        query = query.eq("department", dbDepartment);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // 🔁 Normalize for frontend
    const members = (data ?? []).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      department: DEPARTMENT_MAP[m.department] ?? null, // ✅ normalized
      role_name: m.role_name,
      active: m.active,
      created_at: m.created_at,

      // profile fields from view
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
