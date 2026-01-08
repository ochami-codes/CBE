// routes/attendance.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * GET attendance
 * GET /attendance?department=youth&date=2025-01-01
 */
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder", "youth_leader"]),
  async (req, res) => {
    const { department, date } = req.query;

    if (!department || !date) {
      return res.status(400).json({ message: "department and date are required" });
    }

    const { data, error } = await req.supabase
      .from("attendance")
      .select("member_id, present")
      .eq("department", department)
      .eq("date", date);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json({ records: data });
  }
);

/**
 * POST save attendance (UPSERT)
 * POST /attendance
 * body: { records: [] }
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder", "youth_leader"]),
  async (req, res) => {
    const { records } = req.body;

    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ message: "records array is required" });
    }

    const payload = records.map(r => ({
      member_id: r.member_id,
      department: r.department,
      date: r.date,
      present: !!r.present,
    }));

    const { error } = await req.supabase
      .from("attendance")
      .upsert(payload, {
        onConflict: ["member_id", "department", "date"],
      });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json({ success: true });
  }
);

export default router;
