// backend/routes/membership/admin.js
import express from "express";
const router = express.Router();

import { supabaseAdmin } from "../../supabaseClient.js";

/* -------------------------
   GET /admin/membership-requests
   Fetch all membership requests
------------------------- */
router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("membership_requests")
    .select(`
      id,
      profile_id,
      membership_request_status,
      membership_requested_at,
      membership_reviewed_at,
      requester:profiles(full_name,email)
    `)
    .order("membership_requested_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  res.json({ requests: data });
});

/* -------------------------
   POST /admin/membership-requests/:id/approve
------------------------- */
router.post("/:id/approve", async (req, res) => {
  const id = req.params.id;
  const { error } = await supabaseAdmin
    .from("membership_requests")
    .update({ membership_request_status: "approved", membership_reviewed_at: new Date() })
    .eq("id", id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

/* -------------------------
   POST /admin/membership-requests/:id/reject
------------------------- */
router.post("/:id/reject", async (req, res) => {
  const id = req.params.id;
  const { error } = await supabaseAdmin
    .from("membership_requests")
    .update({ membership_request_status: "rejected", membership_reviewed_at: new Date() })
    .eq("id", id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

/* -------------------------
   POST /admin/membership-requests/invite/:id
   Invite a profile who is not yet a member
------------------------- */
router.post("/invite/:id", async (req, res) => {
  const profileId = req.params.id;

  const { data: existing } = await supabaseAdmin
    .from("membership_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("membership_request_status", "pending")
    .maybeSingle();

  if (existing) return res.status(400).json({ message: "Request already pending" });

  const { error } = await supabaseAdmin
    .from("membership_requests")
    .insert({ profile_id: profileId, membership_request_status: "pending" });

  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json({ success: true });
});

/* -------------------------
   GET /admin/non-members
   Fetch profiles not yet members or requested
------------------------- */
router.get("/non-members", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .not("id", "in", supabaseAdmin
        .from("membership_requests")
        .select("profile_id")
        .then(({ data: requests }) => requests.map(r => r.profile_id))
      );

    if (error) throw error;

    res.json({ profiles: data });
  } catch (err) {
    console.error("Fetch non-members error:", err);
    res.status(500).json({ message: "Failed to fetch non-members" });
  }
});

export default router;
