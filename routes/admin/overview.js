// routes/admin/overview.js
import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;

    // 1️⃣ Members summary
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, department");
    if (membersError) throw membersError;

    const counts = {
      youth: members.filter((m) => m.department === "youth").length,
      children: members.filter((m) => m.department === "children").length,
      adults: members.filter((m) => m.department === "adults").length,
      total: members.length,
    };

    // 2️⃣ Attendance trend (last 30 days, grouped by date)
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("date, present")
      .order("date", { ascending: false })
      .limit(30);
    if (attendanceError) throw attendanceError;

    const map = {};
    attendanceData.forEach((rec) => {
      if (!rec?.date) return;
      if (!map[rec.date]) map[rec.date] = 0;
      if (rec.present) map[rec.date] += 1;
    });

    const sortedDates = Object.keys(map).sort((a, b) => new Date(a) - new Date(b));
    const attendanceTrend = sortedDates.slice(-6).map((d) => ({ date: d, count: map[d] }));

    // 3️⃣ Offerings & Expenses
    const { data: offerings, error: offeringsError } = await supabase.from("offerings").select("amount");
    if (offeringsError) throw offeringsError;
    const offerSummary = offerings.reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const { data: expenses, error: expensesError } = await supabase.from("expenses").select("amount");
    if (expensesError) throw expensesError;
    const expenseSummary = expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0);

    // 4️⃣ Recent announcements/events
    const { data: events, error: eventsError } = await supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (eventsError) throw eventsError;

    // ✅ Send combined response
    res.json({
      counts,
      attendanceTrend,
      offerSummary,
      expenseSummary,
      events,
    });
  } catch (err) {
    console.error("Overview error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
