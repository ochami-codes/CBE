import express from "express";
const router = express.Router();

/* -------------------------
   POST /membership-requests
   Logged-in user requests membership
------------------------- */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { id: profileId, is_member } = req.user;

  if (is_member) {
    return res.status(400).json({ message: "Already a member" });
  }

  // Fetch latest church
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("church_id")
    .eq("id", profileId)
    .single();

  if (profileError) {
    console.error(profileError);
    return res.status(500).json({ message: "Failed to verify profile" });
  }

  if (!profile?.church_id) {
    return res.status(400).json({ message: "Church not selected" });
  }

  const church_id = profile.church_id;

  // Prevent duplicate pending request
  const { data: existing, error: existingError } = await supabase
    .from("membership_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("membership_request_status", "pending")
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
    return res.status(500).json({ message: "Failed to check existing requests" });
  }

  if (existing) {
    return res.status(400).json({ message: "Request already pending" });
  }

  // Create request
  const { data, error } = await supabase
    .from("membership_requests")
    .insert({
      profile_id: profileId,
      church_id,
      membership_request_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to submit membership request" });
  }

  res.status(201).json({ request: data });
});

/* -------------------------
   GET /membership-requests/me
   Logged-in user checks latest request status
------------------------- */
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
    console.error(error);
    return res.status(500).json({ message: "Failed to load membership request" });
  }

  res.json({ request: data || null });
});
/* -------------------------
   PATCH /membership-requests/:id/respond
   User responds to an invite (accept / reject)
------------------------- */
router.patch("/:id/respond", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;
  const { id } = req.params;
  const { action } = req.body; // "accepted" | "rejected"

  if (!["accepted", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  // Fetch the membership request
  const { data: requestData, error: fetchError } = await supabase
    .from("membership_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !requestData) {
    console.error(fetchError);
    return res.status(404).json({ message: "Membership request not found" });
  }

  // Ensure the invite belongs to this user
  if (requestData.profile_id !== profileId) {
    return res.status(403).json({ message: "Not authorized" });
  }

  // Ensure it is still pending
  if (requestData.membership_request_status !== "pending") {
    return res.status(400).json({ message: "Request already handled" });
  }

  // Update membership request status
  const { error: updateError } = await supabase
    .from("membership_requests")
    .update({
      membership_request_status: action,
      membership_reviewed_at: new Date(),
    })
    .eq("id", id);

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ message: "Failed to update request" });
  }

  // If accepted → update profile to member
  if (action === "accepted") {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_member: true })
      .eq("id", profileId);

    if (profileError) {
      console.error(profileError);
      return res.status(500).json({ message: "Failed to update membership" });
    }
  }
// mark related notification as read
await supabase
  .from("notifications")
  .update({ is_read: true })
  .eq("related_id", id)
  .eq("profile_id", profileId);
  res.json({ success: true });
});
export default router;
