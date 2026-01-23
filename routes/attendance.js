// backend/routes/attendance.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * GET /attendance
 * Query params: department, date
 * Returns attendance records for a given department on a specific date
 */
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder", "youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { department, date } = req.query;

    if (!department || !date) {
      return res.status(400).json({ error: "department and date are required" });
    }

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("member_id, present")
        .eq("department", department)
        .eq("date", date);

      if (error) throw error;

      res.json({ records: data ?? [] });
    } catch (err) {
      console.error("Fetch attendance error:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  }
);

/**
 * POST /attendance
 * body: { records: [{ member_id, department, date, present }] }
 * UPSERT attendance records
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "elder", "youth_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "records array is required" });
    }

    const payload = records.map((r) => ({
      member_id: r.member_id,
      department: r.department,
      date: r.date,
      present: !!r.present,
    }));

    try {
      const { error } = await supabase
        .from("attendance")
        .upsert(payload, {
          onConflict: ["member_id", "department", "date"],
        });

      if (error) throw error;

      res.json({ success: true, message: "Attendance saved successfully" });
    } catch (err) {
      console.error("Save attendance error:", err);
      res.status(500).json({ error: "Failed to save attendance" });
    }
  }
);

export default router;
