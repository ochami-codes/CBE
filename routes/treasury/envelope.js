// routes/treasury/envelope.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireRole } from "../../middleware/requireRole.js"; // treasurer or admin
const router = express.Router();

/**
 * POST /treasury/envelope
 * Add a new envelope entry (tithe, offering, department, etc.)
 */
router.post(
  "/",
  authMiddleware,
  requireRole(["treasurer", "admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const userId = req.user.id;
    const churchId = req.user.church_id;

    const { type, amount, department, date } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ message: "Type and amount are required" });
    }

    try {
      const { data, error } = await supabase
        .from("treasury_envelopes")
        .insert([
          {
            church_id: churchId,
            entered_by: userId,
            type,
            department: department || null,
            amount,
            entry_date: date || new Date(),
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      res.status(201).json({ message: "Envelope entry recorded", entry: data });
    } catch (err) {
      console.error("Envelope entry error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /treasury/envelope?period=quarter|year
 * Fetch all envelope entries for the current church filtered by period
 */
router.get(
  "/",
  authMiddleware,
  requireRole(["treasurer", "admin"]),
  async (req, res) => {
    const supabase = req.supabase;
    const churchId = req.user.church_id;
    const period = req.query.period || "quarter";

    try {
      // calculate start date
      const dayjs = await import("dayjs");
      let startDate;
      const now = dayjs.default();

      if (period === "year") {
        startDate = now.startOf("year").toDate();
      } else {
        // default quarterly
        const quarter = Math.floor((now.month() + 3) / 3);
        startDate = now.startOf("year").add((quarter - 1) * 3, "month").toDate();
      }

      const { data, error } = await supabase
        .from("treasury_envelopes")
        .select("*")
        .eq("church_id", churchId)
        .gte("entry_date", startDate)
        .order("entry_date", { ascending: false });

      if (error) throw error;

      res.json({ period, entries: data });
    } catch (err) {
      console.error("Fetch envelope entries error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
