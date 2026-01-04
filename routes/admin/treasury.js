import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;

    const { data: offerings, error: offeringsError } = await supabase
      .from("offerings")
      .select("id");

    if (offeringsError) throw offeringsError;

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("id");

    if (expensesError) throw expensesError;

    res.json({
      offeringsCount: offerings.length,
      expensesCount: expenses.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
