// backend/routes/attendance.js
import express from "express";

const router = express.Router();

/* =====================================================
   Helpers
===================================================== */
function canRead(req, res) {
  const { permissions, is_member } = req.user;

  if (!is_member) {
    res.status(403).json({ error: "Members only" });
    return false;
  }

  if (!permissions.includes("access_attendance")) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  return true;
}

function canWrite(req, res) {
  const { permissions, is_member } = req.user;

  if (!is_member) {
    res.status(403).json({ error: "Members only" });
    return false;
  }

  if (!permissions.includes("manage_attendance")) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  return true;
}

/**
 * GET /attendance
 */
router.get("/", async (req, res) => {
  if (!canRead(req, res)) return;

  const supabase = req.supabase;
  const { department, date } = req.query;
  const { church_id } = req.user;

  if (!department || !date) {
    return res.status(400).json({ error: "department and date are required" });
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("member_id, present, notes, service_type")
      .eq("department", department)
      .eq("date", date)
      .eq("church_id", church_id); // 🔒 important

    if (error) throw error;

    res.json({ records: data ?? [] });
  } catch (err) {
    console.error("Fetch attendance error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

/**
 * POST /attendance
 */
router.post("/", async (req, res) => {
  if (!canWrite(req, res)) return;

  const supabase = req.supabase;
  const { records } = req.body;
  const { church_id } = req.user;

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
    church_id, // 🔒 enforce from auth
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
});

/**
 * GET /attendance/monthly-summary
 */
router.get("/monthly-summary", async (req, res) => {
  if (!canRead(req, res)) return;

  const supabase = req.supabase;
  const { department, month } = req.query;
  const { church_id } = req.user;

  if (!department || !month) {
    return res.status(400).json({ error: "department and month are required" });
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("member_id, present, date")
      .eq("department", department)
      .eq("church_id", church_id)
      .ilike("date", `${month}-%`);

    if (error) throw error;

    const summary = {};

    data.forEach((r) => {
      if (!summary[r.member_id]) {
        summary[r.member_id] = { present: 0, total: 0 };
      }
      summary[r.member_id].total += 1;
      if (r.present) summary[r.member_id].present += 1;
    });

    const result = Object.entries(summary).map(([member_id, stats]) => ({
      member_id,
      percentage: stats.total
        ? (stats.present / stats.total) * 100
        : 0,
    }));

    res.json({ summary: result });
  } catch (err) {
    console.error("Monthly summary error:", err);
    res.status(500).json({ error: "Failed to fetch monthly summary" });
  }
});

/**
 * GET /attendance/yearly-summary
 */
router.get("/yearly-summary", async (req, res) => {
  if (!canRead(req, res)) return;

  const supabase = req.supabase;
  const { department, year } = req.query;
  const { church_id } = req.user;

  if (!department || !year) {
    return res.status(400).json({ error: "department and year are required" });
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("member_id, present, date")
      .eq("department", department)
      .eq("church_id", church_id)
      .ilike("date", `${year}-%`);

    if (error) throw error;

    const summary = {};

    data.forEach((r) => {
      const month = r.date.slice(5, 7);

      if (!summary[month]) {
        summary[month] = { present: 0, total: 0 };
      }

      summary[month].total += 1;
      if (r.present) summary[month].present += 1;
    });

    const result = Object.entries(summary).map(([month, stats]) => ({
      month,
      percentage: stats.total
        ? (stats.present / stats.total) * 100
        : 0,
    }));

    res.json({ summary: result });
  } catch (err) {
    console.error("Yearly summary error:", err);
    res.status(500).json({ error: "Failed to fetch yearly summary" });
  }
});

export default router;
