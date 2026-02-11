// routes/treasury/transactions.js
import express from "express";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

/* =====================================================
   POST /treasury/transactions
   Add a new treasury transaction
===================================================== */
router.post(
  "/",
  
  requireRole(["Admin", "Treasurer"]),
  async (req, res) => {
    try {
      const supabaseClient = req.supabase; // use attached Supabase client
      const { church_id: churchId, id: userId } = req.user;
      const { fund_id, type, amount, date, reference, notes } = req.body;

      // 1️⃣ Validate required fields
      if (!fund_id || !type || !amount || !date) {
        return res
          .status(400)
          .json({ error: "fund_id, type, amount, and date are required" });
      }

      // 2️⃣ Insert transaction
      const { data, error } = await supabaseClient
        .from("treasury_transactions")
        .insert({
          church_id: churchId,
          fund_id,
          type,
          amount,
          date,
          reference: reference || null,
          notes: notes || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, transaction: data });
    } catch (err) {
      console.error("POST /treasury/transactions error:", err);
      res.status(500).json({
        error: err.message || "Failed to create transaction",
      });
    }
  }
);

export default router;
