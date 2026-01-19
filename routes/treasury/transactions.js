import express from "express";
import { supabase } from "../../supabaseClient.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

/* ============================
   POST /treasury/transactions
============================ */
router.post(
  "/",
  requireRole(["Admin", "Treasurer"]),
  async (req, res) => {
    const churchId = req.user.church_id;
    const userId = req.user.id;

    const {
      fund_id,
      type, // income | expense
      amount,
      date,
      reference,
      notes,
    } = req.body;

    if (!fund_id || !type || !amount || !date) {
      return res
        .status(400)
        .json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  }
);

export default router;
