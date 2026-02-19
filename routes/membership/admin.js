import express from "express";
const router = express.Router();

import { supabaseAdmin } from "../../supabaseClient.js";

/* -------------------------
   GET /admin/membership-requests
   Fetch all membership requests for the current church,
   normalize status for frontend ("pending" or "new")
------------------------- */
router.get("/", async (req, res) => {
  try {
    const churchId = req.user?.church_id;

    if (!churchId) {
      return res.status(400).json({ message: "Church ID not found" });
    }

    // Fetch all profiles in this church
    const { data, error } = await supabaseAdmin
      .from("member_full_dashboard")
      .select(`
        membership_request_id,
        profile_id,
        full_name,
        email,
        membership_request_status,
        membership_requested_at,
        membership_reviewed_at,
        is_member
      `)
      .eq("church_id", churchId)
      .order("membership_requested_at", { ascending: false });

    if (error) throw error;

    // Normalize status for frontend
    const requests = data.map((r) => ({
      ...r,
      membership_request_status: r.membership_request_status
        ? r.membership_request_status // keep "pending", "approved", etc.
        : "new", // default for profiles without request
    }));

    res.json({ requests });

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

    // 1️⃣ Get request + validate church ownership
    const { data: request, error: fetchError } = await supabaseAdmin
      .from("member_full_dashboard")
      .select("profile_id, church_id")
      .eq("membership_request_id", requestId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (fetchError || !request)
      return res.status(404).json({ message: "Request not found" });

    // 2️⃣ Approve request
    const { error: updateError } = await supabaseAdmin
      .from("membership_requests")
      .update({
        membership_request_status: "approved",
        membership_reviewed_at: new Date()
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // 3️⃣ Insert into members table
    const { error: insertError } = await supabaseAdmin
      .from("members")
      .insert({
        profile_id: request.profile_id,
        church_id: churchId,
        active: true
      });

    if (insertError) throw insertError;

    res.json({ success: true });

  } catch (err) {
    console.error("Approve membership error:", err);
    res.status(500).json({ message: "Failed to approve membership" });
  }
});


/* -------------------------
   POST /admin/membership-requests/:id/reject
------------------------- */
router.post("/:id/reject", async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const requestId = req.params.id;

    const { error } = await supabaseAdmin
      .from("membership_requests")
      .update({
        membership_request_status: "rejected",
        membership_reviewed_at: new Date()
      })
      .eq("id", requestId)
      .eq("church_id", churchId);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error("Reject membership error:", err);
    res.status(500).json({ message: "Failed to reject membership" });
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
