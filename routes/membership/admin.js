import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/* =====================================================
   Middleware — Ensure Church Context Exists
===================================================== */
const requireChurch = (req, res, next) => {
  if (!req.user?.church_id || !req.user?.id) {
    return res.status(400).json({
      message: "Church context missing"
    });
  }
  next();
};

/* =====================================================
   GET Active Membership Requests (User Requests Only)
===================================================== */
router.get("/", requireChurch, async (req, res) => {
  try {
    const churchId = req.user.church_id;

    const { data, error } = await supabaseAdmin
      .from("member_full_dashboard")
      .select(`
        membership_request_id,
        profile_id,
        full_name,
        email,
        membership_status,
        membership_source,
        membership_requested_at
      `)
      .eq("church_id", churchId)
      .eq("membership_source", "user_request")
      .eq("membership_status", "requested")
      .order("membership_requested_at", { ascending: false });

    if (error) throw error;

    res.json({ requests: data || [] });

  } catch (err) {
    console.error("Fetch membership requests error:", err);
    res.status(500).json({
      message: "Failed to fetch membership requests"
    });
  }
});

/* =====================================================
   Approve Membership (Admin Reviews User Request)
===================================================== */
router.post("/:id/approve", requireChurch, async (req, res) => {
  try {
    const requestId = req.params.id;

    const { error } = await supabaseAdmin.rpc(
      "admin_review_membership_request",
      {
        p_request_id: requestId,
        p_action: "approved",
        p_admin_profile_id: req.user.id,
        p_church_id: req.user.church_id
      }
    );

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error("Approve membership error:", err);
    res.status(400).json({
      message: err.message || "Approval failed"
    });
  }
});

/* =====================================================
   Reject Membership (Admin Reviews User Request)
===================================================== */
router.post("/:id/reject", requireChurch, async (req, res) => {
  try {
    const requestId = req.params.id;

    const { error } = await supabaseAdmin.rpc(
      "admin_review_membership_request",
      {
        p_request_id: requestId,
        p_action: "rejected",
        p_admin_profile_id: req.user.id,
        p_church_id: req.user.church_id
      }
    );

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error("Reject membership error:", err);
    res.status(400).json({
      message: err.message || "Rejection failed"
    });
  }
});

/* =====================================================
   Invite Profile To Church
===================================================== */
router.post("/invite/:id", requireChurch, async (req, res) => {
  try {
    const profileId = req.params.id;

    const { data, error } = await supabaseAdmin.rpc("invite_member", {
      p_profile_id: profileId,
      p_church_id: req.user.church_id,
      p_admin_profile_id: req.user.id
    });

    if (error) throw error;

    res.status(201).json({
      success: true,
      requestId: data
    });

  } catch (err) {
    console.error("Invite error:", err);
    res.status(400).json({
      message: err.message || "Failed to send invite"
    });
  }
});

/* =====================================================
   Fetch Non-Members
===================================================== */
router.get("/non-members", requireChurch, async (req, res) => {
  try {
    const churchId = req.user.church_id;

    const { data, error } = await supabaseAdmin
      .from("member_full_dashboard")
      .select(`
        profile_id,
        full_name,
        email,
        phone,
        is_member,
        membership_status,
        membership_source,
        membership_requested_at
      `)
      .eq("church_id", churchId)
      .eq("is_member", false)
      .order("full_name", { ascending: true });

    if (error) throw error;

    res.json({ non_members: data || [] });

  } catch (err) {
    console.error("Fetch non-members error:", err);
    res.status(500).json({
      message: "Failed to fetch non-members"
    });
  }
});

export default router;
