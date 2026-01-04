import express from "express";
const router = express.Router();

/**
 * GET attendance for a department & date
 * GET /admin/attendance?department=youth&date=2025-01-01
 */
router.get("/", async (req, res) => {
  const { department, date } = req.query;

  if (!department || !date) {
    return res.status(400).json({
      message: "department and date are required",
    });
  }

  const { data, error } = await req.supabase
    .from("attendance")
    .select("member_id, present")
    .eq("department", department)
    .eq("date", date);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  // Convert to map { memberId: present }
  const attendanceMap = {};
  data.forEach(row => {
    attendanceMap[row.member_id] = row.present;
  });

  res.json(attendanceMap);
});

/**
 * POST save attendance (upsert)
 * POST /admin/attendance
 */
router.post("/", async (req, res) => {
  const { department, date, records } = req.body;

  if (!department || !date || !Array.isArray(records)) {
    return res.status(400).json({
      message: "department, date and records are required",
    });
  }

  const payload = records.map(r => ({
    member_id: r.member_id,
    department,
    date,
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
});

/**
 * DELETE attendance for a date & department (optional but useful)
 * DELETE /admin/attendance?department=youth&date=2025-01-01
 */
router.delete("/", async (req, res) => {
  const { department, date } = req.query;

  if (!department || !date) {
    return res.status(400).json({
      message: "department and date are required",
    });
  }

  const { error } = await req.supabase
    .from("attendance")
    .delete()
    .eq("department", department)
    .eq("date", date);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  res.json({ success: true });
});

export default router;
