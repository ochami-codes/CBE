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
   GET Pending Membership Requests
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
      .eq("membership_request_status", "pending")
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
   Approve Membership (Atomic RPC Preferred)
===================================================== */
router.post("/:id/approve", requireChurch, async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const requestId = req.params.id;

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
      .eq("membership_request_status", "pending")
      .is("processed_at", null)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: "Request not found or already processed"
      });
    }

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

    /* ---- Check Existing Membership ---- */
    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("profile_id", profileId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (existingMember) {
      return res.status(400).json({
        message: "Already a member"
      });
    }

    /* ---- Check Pending Request ---- */
    const { data: existingRequest } = await supabaseAdmin
      .from("membership_requests")
      .select("id")
      .eq("profile_id", profileId)
      .eq("church_id", churchId)
      .eq("membership_request_status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return res.status(400).json({
        message: "Request already pending"
      });
    }

    /* ---- Create Invite Request ---- */
    const { error } = await supabaseAdmin
      .from("membership_requests")
      .insert({
        profile_id: profileId,
        church_id: churchId,
        membership_request_status: "pending",
        membership_requested_at: new Date()
      });

    if (error) throw error;

    res.status(201).json({ success: true });

  } catch (err) {
    console.error("Invite error:", err);

    res.status(500).json({
      message: "Failed to send invite"
    });
  }
});

/* =====================================================
   Fetch Non-Members In Church
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
        is_member,
        membership_request_status,
        membership_requested_at
      `)
      .eq("church_id", churchId)
      .eq("is_member", false)
      .order("full_name", { ascending: true });

    if (error) throw error;

    const nonMembers = (data || []).map(p => ({
      id: p.profile_id,
      full_name: p.full_name,
      email: p.email,
      is_member: !!p.is_member,
      membership_request_status: p.membership_request_status || null,
      membership_requested_at: p.membership_requested_at || null
    }));

    res.json({ non_members: nonMembers });

  } catch (err) {
    console.error("Fetch non-members error:", err);

    res.status(500).json({
      message: "Failed to fetch non-members"
    });
  }
});

export default router;
