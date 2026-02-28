import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/* =====================================================
   Middleware — Ensure Church Context Exists
===================================================== */
const requireChurch = (req, res, next) => {
  if (!req.user?.church_id) {
    return res.status(400).json({
      message: "Church context missing"
    });
  }
  next();
};

/* =====================================================
   GET Active Membership Requests (requested only)
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
        membership_request_status,
        membership_requested_at
      `)
      .eq("church_id", churchId)
      .eq("membership_request_status", "requested")
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
   Approve Membership
===================================================== */
router.post("/:id/approve", requireChurch, async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const requestId = req.params.id;

    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from("membership_requests")
      .select("profile_id")
      .eq("id", requestId)
      .eq("church_id", churchId)
      .single();

    if (fetchError || !requestData) {
      return res.status(404).json({ message: "Request not found" });
    }

    /* ---- RPC (handles member insert + status update) ---- */
    const { error } = await supabaseAdmin.rpc("approve_membership", {
      request_id: requestId,
      approver_church_id: churchId
    });

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
   Reject Membership
===================================================== */
router.post("/:id/reject", requireChurch, async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const requestId = req.params.id;

    const { data, error } = await supabaseAdmin
      .from("membership_requests")
      .update({
        membership_request_status: "rejected",
        membership_reviewed_at: new Date()
      })
      .eq("id", requestId)
      .eq("church_id", churchId)
      .in("membership_request_status", ["requested", "invited"])
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        message: "Request not found or already processed"
      });
    }

    /* ---- Notify User ---- */
    await supabaseAdmin.from("notifications").insert({
      user_id: data.profile_id,
      church_id: churchId,
      title: "Membership Rejected",
      message: "Your membership request was not approved.",
      type: "membership_rejected",
      related_id: requestId,
      is_read: false,
      created_at: new Date()
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Reject membership error:", err);
    res.status(500).json({
      message: "Failed to reject membership"
    });
  }
});

/* =====================================================
   Invite Profile To Church
===================================================== */
router.post("/invite/:id", requireChurch, async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const profileId = req.params.id;

    const { data, error } = await supabaseAdmin.rpc("invite_member", {
      p_profile_id: profileId,
      p_church_id: churchId
    });

    if (error) throw error;

    res.status(201).json({ success: true, requestId: data });

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
        membership_request_status,
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
