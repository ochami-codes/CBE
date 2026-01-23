// backend/routes/admin/overview.js
import express from "express";

const router = express.Router();

/**
 * GET /admin/overview
 * Admin dashboard summary
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  if (!church_id) {
    return res.status(400).json({ error: "Missing church context" });
  }

  try {
    /* ------------------ 1️⃣ Members summary ------------------ */
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, department")
      .eq("church_id", church_id);

    if (membersError) throw membersError;

    const counts = {
      youth: members.filter(m => m.department === "youth").length,
      children: members.filter(m => m.department === "children").length,
      adults: members.filter(m => m.department === "adults").length,
      total: members.length,
    };

    /* ------------------ 2️⃣ Attendance trend (last 30 days) ------------------ */
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("date, present")
      .eq("church_id", church_id)
      .order("date", { ascending: false })
      .limit(30);

    if (attendanceError) throw attendanceError;

    const attendanceMap = {};

    attendance.forEach(({ date, present }) => {
      if (!date) return;
      attendanceMap[date] = (attendanceMap[date] || 0) + (present ? 1 : 0);
    });

    const attendanceTrend = Object.entries(attendanceMap)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-6)
      .map(([date, count]) => ({ date, count }));

    /* ------------------ 3️⃣ Offerings & Expenses ------------------ */
    const { data: offerings, error: offeringsError } = await supabase
      .from("offerings")
      .select("amount")
      .eq("church_id", church_id);

    if (offeringsError) throw offeringsError;

    const offerSummary = offerings.reduce(
      (sum, o) => sum + Number(o.amount || 0),
      0
    );

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("amount")
      .eq("church_id", church_id);

    if (expensesError) throw expensesError;

    const expenseSummary = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    /* ------------------ 4️⃣ Recent announcements ------------------ */
    const { data: announcements, error: announcementsError } = await supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("church_id", church_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (announcementsError) throw announcementsError;

    /* ------------------ 5️⃣ Response ------------------ */
    res.json({
      counts,
      attendanceTrend,
      offerSummary,
      expenseSummary,
      announcements: announcements ?? [],
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({
      error: "Failed to load admin overview",
    });
  }
});

export default router;
