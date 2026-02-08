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
  requireRole(["admin", "pastor", "youth_leader","children_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { department, date } = req.query;

    if (!department || !date) {
      return res.status(400).json({ error: "department and date are required" });
    }

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("member_id, present, notes, service_type")
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
 * body: { records: [{ member_id, department, date, present, notes?, service_type? }] }
 * UPSERT attendance records
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "pastor", "children_leader", "youth_leader"]),
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
      notes: r.notes ?? null,
      service_type: r.service_type ?? null,
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
/**
 * GET /attendance/monthly-summary
 * Query params: department, month (YYYY-MM)
 * Returns total present % for each member in a month
 */
router.get("/monthly-summary", authMiddleware, requireRole(["Admin", "Pastor", "Youth_leader"]), async (req, res) => {
  const supabase = req.supabase;
  const { department, month } = req.query;

  if (!department || !month) {
    return res.status(400).json({ error: "department and month are required" });
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("member_id, present, date")
      .eq("department", department)
      .ilike("date", `${month}-%`); // matches YYYY-MM-DD

    if (error) throw error;

    // Aggregate attendance %
    const summary = {};
    data.forEach((r) => {
      if (!summary[r.member_id]) summary[r.member_id] = { present: 0, total: 0 };
      summary[r.member_id].total += 1;
      if (r.present) summary[r.member_id].present += 1;
    });

    const result = Object.entries(summary).map(([member_id, stats]) => ({
      member_id,
      percentage: stats.total ? (stats.present / stats.total) * 100 : 0,
    }));

    res.json({ summary: result });
  } catch (err) {
    console.error("Monthly summary error:", err);
    res.status(500).json({ error: "Failed to fetch monthly summary" });
  }
});

/**
 * GET /attendance/yearly-summary
 * Query params: department, year (YYYY)
 * Returns attendance % per month for a given year
 */
router.get("/yearly-summary", authMiddleware, requireRole(["Admin", "Pastor", "Youth_leader"]), async (req, res) => {
  const supabase = req.supabase;
  const { department, year } = req.query;

  if (!department || !year) {
    return res.status(400).json({ error: "department and year are required" });
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("member_id, present, date")
      .eq("department", department)
      .ilike("date", `${year}-%`); // matches YYYY-MM-DD

    if (error) throw error;

    // Aggregate per month
    const summary = {};
    data.forEach((r) => {
      const month = r.date.slice(5, 7); // MM
      if (!summary[month]) summary[month] = { present: 0, total: 0 };
      summary[month].total += 1;
      if (r.present) summary[month].present += 1;
    });

    const result = Object.entries(summary).map(([month, stats]) => ({
      month,
      percentage: stats.total ? (stats.present / stats.total) * 100 : 0,
    }));

    res.json({ summary: result });
  } catch (err) {
    console.error("Yearly summary error:", err);
    res.status(500).json({ error: "Failed to fetch yearly summary" });
  }
});

export default router;
