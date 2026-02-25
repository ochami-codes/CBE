import express from "express";
const router = express.Router();

/* =====================================================
   POST /membership-requests
   Logged-in user requests membership
===================================================== */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { id: profileId, is_member } = req.user;

  if (is_member) {
    return res.status(400).json({ message: "Already a member" });
  }

  // Fetch user's selected church
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("church_id")
    .eq("id", profileId)
    .single();

  if (profileError || !profile?.church_id) {
    return res.status(400).json({ message: "Church not selected" });
  }

  const churchId = profile.church_id;

  /* ---- Check Existing Request ---- */
  const { data: existing } = await supabase
    .from("membership_requests")
    .select("id, membership_request_status")
    .eq("profile_id", profileId)
    .eq("church_id", churchId)
    .maybeSingle();

  let requestId;

  if (existing) {
    if (["requested", "invited"].includes(existing.membership_request_status)) {
      return res.status(400).json({
        message: "Membership request already active"
      });
    }

    if (existing.membership_request_status === "rejected") {
      const { error } = await supabase
        .from("membership_requests")
        .update({
          membership_request_status: "requested",
          membership_requested_at: new Date(),
          membership_reviewed_at: null
        })
        .eq("id", existing.id);

      if (error) {
        return res.status(500).json({ message: "Failed to reactivate request" });
      }

      requestId = existing.id;
    }
  }

  if (!existing) {
    const { data, error } = await supabase
      .from("membership_requests")
      .insert({
        profile_id: profileId,
        church_id: churchId,
        membership_request_status: "requested",
        membership_requested_at: new Date()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: "Failed to submit request" });
    }

    requestId = data.id;
  }

  /* ---- Notify Admins ---- */
  // Example: notify all admins in this church
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("church_id", churchId)
    .eq("role", "admin");

  if (admins?.length) {
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title: "New Membership Request",
      message: "A user has requested to join the church.",
      type: "membership_requested",
      related_id: requestId,
      is_read: false,
      created_at: new Date()
    }));

    await supabase.from("notifications").insert(notifications);
  }

  res.status(201).json({ success: true });
});

/* =====================================================
   GET /membership-requests/me
===================================================== */
router.get("/me", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;

  const { data, error } = await supabase
    .from("membership_requests")
    .select("id, membership_request_status, membership_requested_at, membership_reviewed_at")
    .eq("profile_id", profileId)
    .order("membership_requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ message: "Failed to load request" });
  }

  res.json({ request: data || null });
});

/* =====================================================
   PATCH /membership-requests/:id/respond
   User responds to an invite
===================================================== */
router.patch("/:id/respond", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;
  const { id } = req.params;
  const { action } = req.body; // accepted | rejected

  if (!["accepted", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  const { data: requestData } = await supabase
    .from("membership_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!requestData || requestData.profile_id !== profileId) {
    return res.status(404).json({ message: "Request not found" });
  }

  // Only invited requests can be responded to
  if (requestData.membership_request_status !== "invited") {
    return res.status(400).json({ message: "Request already handled" });
  }

  /* ---- Update Request ---- */
  const { error } = await supabase
    .from("membership_requests")
    .update({
      membership_request_status: action,
      membership_reviewed_at: new Date()
    })
    .eq("id", id);

  if (error) {
    return res.status(500).json({ message: "Failed to update request" });
  }

  /* ---- If accepted → add member ---- */
  if (action === "accepted") {
    await supabase.from("members").insert({
      profile_id: profileId,
      church_id: requestData.church_id
    });

    await supabase
      .from("profiles")
      .update({ is_member: true })
      .eq("id", profileId);
  }

  /* ---- Mark Invite Notification Read ---- */
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("related_id", id)
    .eq("user_id", profileId);

  /* ---- Notify Admins of Response ---- */
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("church_id", requestData.church_id)
    .eq("role", "admin");

  if (admins?.length) {
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title: "Invite Response",
      message: `User has ${action} the church invitation.`,
      type: "membership_response",
      related_id: id,
      is_read: false,
      created_at: new Date()
    }));

    await supabase.from("notifications").insert(notifications);
  }

  res.json({ success: true });
});

export default router;
