// routes/members.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

const DEPARTMENT_TABLES = {
  youth: "youth_members",
  children: "children_members",
  choir: "choir_members",
  sabbath_school: "sabbath_school_members",
  amo: "amo_members",
  women: "women_members",
  deaconary: "deaconary_members"
};

/**
 * ADD MEMBER
 * POST /members
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder", "youth_leader", "children_leader"]),
  async (req, res) => {
    const { department, data } = req.body;
    const { church_id } = req.user;

    const table = DEPARTMENT_TABLES[department];
    if (!table) {
      return res.status(400).json({ message: "Invalid department" });
    }

    try {
      const payload = {
        ...data,
        church_id,
        created_at: new Date()
      };

      const { error } = await req.supabase.from(table).insert([payload]);
      if (error) throw error;

      res.status(201).json({ message: "Member added successfully" });
    } catch (err) {
      console.error("Add member error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET MEMBERS
 * GET /members?department=youth
 */
router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    const { department } = req.query;
    const { church_id } = req.user;

    const table = DEPARTMENT_TABLES[department];
    if (!table) {
      return res.status(400).json({ message: "Invalid department" });
    }

    try {
      const { data, error } = await req.supabase
        .from(table)
        .select("*")
        .eq("church_id", church_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({ members: data });
    } catch (err) {
      console.error("Fetch members error:", err);
      res.status(500).json({ message: err.message });
    }
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
    const { id } = req.params;
    const { department, updates } = req.body;
    const { church_id } = req.user;

    const table = DEPARTMENT_TABLES[department];
    if (!table) {
      return res.status(400).json({ message: "Invalid department" });
    }

    try {
      const { error } = await req.supabase
        .from(table)
        .update(updates)
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      res.json({ message: "Member updated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
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
    const { id } = req.params;
    const { department } = req.body;
    const { church_id } = req.user;

    const table = DEPARTMENT_TABLES[department];
    if (!table) {
      return res.status(400).json({ message: "Invalid department" });
    }

    try {
      const { error } = await req.supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      res.json({ message: "Member deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
