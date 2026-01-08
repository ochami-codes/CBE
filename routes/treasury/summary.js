// routes/treasury/summary.js
import express from "express";
import dayjs from "dayjs";

const router = express.Router();

// GET /treasury/summary?period=quarter|year
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const user = req.user;

  if (!user?.church_id) return res.status(401).json({ error: "Unauthorized" });

  const period = req.query.period || "quarter";

  // Determine date range
  let startDate;
  const today = dayjs();
  if (period === "quarter") {
    const currentQuarter = Math.floor((today.month() + 3) / 3);
    startDate = dayjs().quarter(currentQuarter).startOf("quarter").toISOString();
  } else if (period === "year") {
    startDate = today.startOf("year").toISOString();
  } else {
    startDate = today.startOf("quarter").toISOString();
  }

  try {
    const churchId = user.church_id;

    // 1️⃣ Fetch offerings
    const { data: offerings } = await supabase
      .from("offerings")
      .select("*")
      .eq("church_id", churchId)
      .gte("date", startDate);

    // 2️⃣ Fetch expenses
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount")
      .eq("church_id", churchId)
      .gte("date", startDate);

    // 3️⃣ Fetch budget
    const { data: budgetData } = await supabase
      .from("budgets")
      .select("amount")
      .eq("church_id", churchId)
      .gte("date", startDate);

    // Split amounts
    let conference = [];
    let church = [];
    let departments = [];

    const departmentNames = [
      "choir",
      "youth",
      "sabbathSchool",
      "children",
      "amo",
      "women",
      "deaconary",
    ];

    // Aggregate offerings
    const totals = {
      tithe: 0,
      combined: 0,
      camp: 0,
      loose: 0,
      churchDev: 0,
      departments: {},
    };

    departmentNames.forEach(d => totals.departments[d] = 0);

    for (const o of offerings || []) {
      switch (o.account) {
        case "tithe":
          totals.tithe += o.amount;
          break;
        case "combined":
          totals.combined += o.amount;
          break;
        case "camp":
          totals.camp += o.amount;
          break;
        case "loose":
          totals.loose += o.amount;
          break;
        case "churchDevelopment":
          totals.churchDev += o.amount;
          break;
        default:
          if (departmentNames.includes(o.account)) {
            totals.departments[o.account] += o.amount;
          }
      }
    }

    // Prepare conference vs church split
    conference = [
      { account: "Tithe", amount: totals.tithe },
      { account: "Camp Offerings", amount: totals.camp },
      { account: "Combined Offerings", amount: totals.combined / 2 },
    ];

    church = [
      { account: "Kept Combined Offerings", amount: totals.combined / 2 },
      { account: "Loose Offerings", amount: totals.loose },
      { account: "Church Development", amount: totals.churchDev },
    ];

    departments = departmentNames.map(name => ({
      name,
      amount: totals.departments[name] || 0,
    }));

    // Sum expenses & budget
    const expenses = (expensesData || []).reduce((a, i) => a + (i.amount || 0), 0);
    const budget = (budgetData || []).reduce((a, i) => a + (i.amount || 0), 0);

    res.json({
      period,
      conference,
      church,
      departments,
      expenses,
      budget,
    });
  } catch (err) {
    console.error("Treasury summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
