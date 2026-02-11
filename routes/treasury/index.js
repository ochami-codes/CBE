// routes/treasury.js
import express from "express";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

/* =====================================================
   GET /treasury/overview
   Returns treasury summary for the church
===================================================== */
router.get(
  "/overview",
  
  requireRole(["Admin", "Treasurer"]),
  async (req, res) => {
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
  }
);

/* =====================================================
   GET /treasury/fund-groups
   List all fund groups for the church
===================================================== */
router.get(
  "/fund-groups",
  
  requireRole(["Admin", "Treasurer"]),
  async (req, res) => {
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
  }
);

/* =====================================================
   GET /treasury/fund-groups/:groupId/funds
   List all funds within a specific fund group
===================================================== */
router.get(
  "/fund-groups/:groupId/funds",
  
  requireRole(["Admin", "Treasurer"]),
  async (req, res) => {
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
  }
);

/* =====================================================
   GET /treasury/member-giving-summary
   Returns giving summary per member
===================================================== */
router.get(
  "/member-giving-summary",
  
  requireRole(["Admin", "Treasurer"]),
  async (req, res) => {
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
  }
);

export default router;
