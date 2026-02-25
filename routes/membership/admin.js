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

    /* ---- Notify User ---- */
    await supabaseAdmin.from("notifications").insert({
      user_id: requestData.profile_id,
      title: "Membership Approved",
      message: "Your membership request has been approved.",
      type: "membership_approved",
      related_id: requestId,
      is_read: false,
      created_at: new Date()
    });

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

    /* ---- Check Existing Request ---- */
    const { data: existingRequest } = await supabaseAdmin
      .from("membership_requests")
      .select("id, membership_request_status")
      .eq("profile_id", profileId)
      .eq("church_id", churchId)
      .maybeSingle();

    let requestId;

    if (existingRequest) {
      if (["requested", "invited"].includes(existingRequest.membership_request_status)) {
        return res.status(400).json({
          message: "Membership request already active"
        });
      }

      if (existingRequest.membership_request_status === "rejected") {
        const { error } = await supabaseAdmin
          .from("membership_requests")
          .update({
            membership_request_status: "invited",
            membership_requested_at: new Date(),
            membership_reviewed_at: null
          })
          .eq("id", existingRequest.id);

        if (error) throw error;

        requestId = existingRequest.id;
      }
    }

    if (!existingRequest) {
      const { data: newRequest, error } = await supabaseAdmin
        .from("membership_requests")
        .insert({
          profile_id: profileId,
          church_id: churchId,
          membership_request_status: "invited",
          membership_requested_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;
      requestId = newRequest.id;
    }

    /* ---- Notify User ---- */
    await supabaseAdmin.from("notifications").insert({
      user_id: profileId,
      title: "Church Invitation",
      message: "You have been invited to join this church.",
      type: "membership_invite",
      related_id: requestId,
      is_read: false,
      created_at: new Date()
    });

    res.status(201).json({ success: true });

  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({
      message: "Failed to send invite"
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
