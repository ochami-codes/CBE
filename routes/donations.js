// backend/routes/donations.js
import express from "express";

const router = express.Router();

/**
 * POST /donations
 * Make a donation (authenticated users)
 */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { id: user_id, church_id } = req.user;
  const { amount, message } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      error: "Valid donation amount is required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("donations")
      .insert({
        user_id,
        church_id,
        amount,
        message: message || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Donation recorded successfully",
      donation: data,
    });
  } catch (err) {
    console.error("Create donation error:", err);
    res.status(500).json({
      error: "Failed to record donation",
    });
  }
});

/**
 * GET /donations
 * List donations for current church
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  try {
    const { data, error } = await supabase
      .from("donations")
      .select("*")
      .eq("church_id", church_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ donations: data });
  } catch (err) {
    console.error("Fetch donations error:", err);
    res.status(500).json({
      error: "Failed to fetch donations",
    });
  }
});

export default router;
