import express from "express";
import { supabase } from "../../supabaseClient.js";
import { requireRole } from "../../middleware/requireRole.js";
import { applyDateFilter } from "../../utils/dateFilter.js";

const router = express.Router();

/* ============================
   GET /treasury/overview
============================ */
router.get("/overview", async (req, res) => {
  const churchId = req.user.church_id;

  let query = supabase
    .from("treasury_overview")
    .select("*")
    .eq("church_id", churchId)
    .single();

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/* ============================
   GET /treasury/fund-groups
============================ */
router.get("/fund-groups", async (req, res) => {
  const churchId = req.user.church_id;

  const { data, error } = await supabase
    .from("fund_group_totals")
    .select("*")
    .eq("church_id", churchId)
    .order("group_name");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/* ============================
   GET /treasury/fund-groups/:groupId/funds
============================ */
router.get("/fund-groups/:groupId/funds", async (req, res) => {
  const churchId = req.user.church_id;
  const { groupId } = req.params;

  const { data, error } = await supabase
    .from("fund_totals")
    .select("*")
    .eq("church_id", churchId)
    .eq("group_id", groupId)
    .order("fund_name");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/* ============================
   GET /treasury/member-giving-summary
============================ */
router.get("/member-giving-summary", async (req, res) => {
  const churchId = req.user.church_id;

  const { data, error } = await supabase
    .from("member_giving_summary")
    .select("*")
    .eq("church_id", churchId)
    .order("full_name");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

export default router;
