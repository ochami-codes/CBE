import express from "express";
const router = express.Router();

import { supabaseAdmin } from "../../supabaseClient.js";

/* -------------------------
   GET /admin/membership-requests
   Fetch ONLY pending membership requests
------------------------- */
router.get("/", async (req, res) => {
  try {
    const churchId = req.user?.church_id;

    if (!churchId) {
      return res.status(400).json({ message: "Church ID not found" });
    }

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
      .eq("membership_request_status", "pending") // ONLY pending
      .order("membership_requested_at", { ascending: false });

    if (error) throw error;

    res.json({ requests: data });

  } catch (err) {
    console.error("Fetch membership requests error:", err);
    res.status(500).json({ message: "Failed to fetch membership requests" });
  }
});
/* -------------------------
   POST /admin/membership-requests/:id/approve
------------------------- */
router.post("/:id/approve", async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const requestId = req.params.id;

    if (!churchId)
      return res.status(400).json({ message: "Invalid church context" });

    // Call atomic database function
    const { error } = await supabaseAdmin.rpc("approve_membership", {
      request_id: requestId,
      approver_church_id: churchId,
    });

    if (error) {
      console.error("Approve membership RPC error:", error);
      return res.status(400).json({
        message: error.message || "Approval failed",
      });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Approve membership error:", err);
    return res.status(500).json({
      message: "Failed to approve membership",
    });
  }
});

/* -------------------------
   POST /admin/membership-requests/:id/reject
------------------------- */
router.post("/:id/reject", async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const requestId = req.params.id;

    const { data, error } = await supabaseAdmin
      .from("membership_requests")
      .update({
        membership_request_status: "rejected",
        membership_reviewed_at: new Date(),
      })
      .eq("id", requestId)
      .eq("church_id", churchId)
      .eq("membership_request_status", "pending") // prevent double action
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: "Request not found or already processed",
      });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Reject membership error:", err);
    return res.status(500).json({
      message: "Failed to reject membership",
    });
  }
});

/* -------------------------
   POST /admin/membership-requests/invite/:id
------------------------- */
router.post("/invite/:id", async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const profileId = req.params.id;

    // Check if already member
    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("profile_id", profileId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (existingMember)
      return res.status(400).json({ message: "Already a member" });

    // Check if pending request exists
    const { data: existingRequest } = await supabaseAdmin
      .from("membership_requests")
      .select("id")
      .eq("profile_id", profileId)
      .eq("church_id", churchId)
      .eq("membership_request_status", "pending")
      .maybeSingle();

    if (existingRequest)
      return res.status(400).json({ message: "Request already pending" });

    // Insert request
    const { error } = await supabaseAdmin
      .from("membership_requests")
      .insert({
        profile_id: profileId,
        church_id: churchId,
        membership_request_status: "pending"
      });

    if (error) throw error;

    res.status(201).json({ success: true });

  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ message: "Failed to send invite" });
  }
});


/* -------------------------
   GET /admin/non-members
   Fetch all profiles in the church who are not yet members,
   including their membership request status and requested date
------------------------- */
router.get("/non-members", async (req, res) => {
  try {
    const churchId = req.user?.church_id;

    if (!churchId) {
      return res.status(400).json({ message: "Church ID not found" });
    }

    // Fetch profiles from the member_full_dashboard view
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
      .not("is_member", "eq", true) // exclude current members
      .order("full_name", { ascending: true });

    if (error) throw error;

    // Format response to be frontend-ready
    const non_members = data.map((p) => ({
      id: p.profile_id,
      full_name: p.full_name,
      email: p.email,
      is_member: p.is_member || false,
      membership_request_status: p.membership_request_status || null,
      membership_requested_at: p.membership_requested_at || null,
    }));

    res.json({ non_members });
  } catch (err) {
    console.error("Fetch non-members error:", err);
    res.status(500).json({ message: "Failed to fetch non-members" });
  }
});

export default router;
