// routes/treasury/transactions.js
import express from "express";

const router = express.Router();

/* =====================================================
   Helper: Treasury Write Access
===================================================== */
function requireTreasuryWrite(req, res) {
  const { permissions, is_member } = req.user;

  if (!is_member) {
    res.status(403).json({ error: "Members only" });
    return false;
  }

  // 🔥 You can change this to "manage_treasury" later if you want stricter control
  if (!permissions.includes("access_treasury_dashboard")) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  return true;
}

/* =====================================================
   POST /treasury/transactions
===================================================== */
router.post("/", async (req, res) => {
  if (!requireTreasuryWrite(req, res)) return;

  try {
    const supabaseClient = req.supabase;
    const { church_id: churchId, id: userId } = req.user;

    const {
      fund_id,
      type,
      amount,
      date,
      reference,
      notes,
    } = req.body;

    // 1️⃣ Validate required fields
    if (!fund_id || !type || !amount || !date) {
      return res.status(400).json({
        error: "fund_id, type, amount, and date are required",
      });
    }

    // 2️⃣ Insert transaction
    const { data, error } = await supabaseClient
      .from("treasury_transactions")
      .insert({
        church_id: churchId,   // ✅ from auth
        fund_id,
        type,
        amount,
        date,
        reference: reference || null,
        notes: notes || null,
        created_by: userId,    // ✅ from auth
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      transaction: data,
    });
  } catch (err) {
    console.error("POST /treasury/transactions error:", err);
    res.status(500).json({
      error: err.message || "Failed to create transaction",
    });
  }
});

export default router;
