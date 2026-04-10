// routes/treasury.js
import express from "express";

const router = express.Router();

/* =====================================================
   Helper: Treasury Access Guard
===================================================== */
function requireTreasuryAccess(req, res) {
  const { permissions, is_member } = req.user;

  if (!is_member) {
    res.status(403).json({ error: "Members only" });
    return false;
  }

  if (!permissions.includes("access_treasury_dashboard")) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  return true;
}

/* =====================================================
   GET /treasury/overview
===================================================== */
router.get("/overview", async (req, res) => {
  if (!requireTreasuryAccess(req, res)) return;

  try {
    const { church_id } = req.user;

    const { data, error } = await req.supabase
      .from("treasury_overview")
      .select("*")
      .eq("church_id", church_id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Treasury overview error:", err);
    res.status(500).json({ error: "Failed to fetch treasury overview" });
  }
});

/* =====================================================
   GET /treasury/fund-groups
===================================================== */
router.get("/fund-groups", async (req, res) => {
  if (!requireTreasuryAccess(req, res)) return;

  try {
    const { church_id } = req.user;

    const { data, error } = await req.supabase
      .from("fund_group_totals")
      .select("*")
      .eq("church_id", church_id)
      .order("group_name");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Fund groups fetch error:", err);
    res.status(500).json({ error: "Failed to fetch fund groups" });
  }
});

/* =====================================================
   GET /treasury/fund-groups/:groupId/funds
===================================================== */
router.get("/fund-groups/:groupId/funds", async (req, res) => {
  if (!requireTreasuryAccess(req, res)) return;

  try {
    const { church_id } = req.user;
    const { groupId } = req.params;

    const { data, error } = await req.supabase
      .from("fund_totals")
      .select("*")
      .eq("church_id", church_id)
      .eq("group_id", groupId)
      .order("fund_name");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(`Funds fetch error for group ${req.params.groupId}:`, err);
    res.status(500).json({ error: "Failed to fetch funds" });
  }
});

/* =====================================================
   GET /treasury/member-giving-summary
===================================================== */
router.get("/member-giving-summary", async (req, res) => {
  if (!requireTreasuryAccess(req, res)) return;

  try {
    const { church_id } = req.user;

    const { data, error } = await req.supabase
      .from("member_giving_summary")
      .select("*")
      .eq("church_id", church_id)
      .order("full_name");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Member giving summary error:", err);
    res.status(500).json({ error: "Failed to fetch member giving summary" });
  }
});

export default router;
