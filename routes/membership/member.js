import express from "express";

const router = express.Router();

/* ----------------------------------
   POST /membership-requests
   Logged-in user requests membership
---------------------------------- */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { id: profileId, is_member } = req.user;

  // Already a member
  if (is_member) {
    return res.status(400).json({ message: "Already a member" });
  }

  // 🔑 Always fetch latest church from DB
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
  const { data: existing } = await supabase
    .from("membership_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("membership_request_status", "pending")
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ message: "Request already pending" });
  }

  // Create membership request
  const { error } = await supabase.from("membership_requests").insert({
    profile_id: profileId,
    church_id,
    membership_request_status: "pending",
  });

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to submit request" });
  }

  res.status(201).json({ success: true });
});

/* ----------------------------------
   GET /membership-requests/me
   Logged-in user checks request status
---------------------------------- */
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
    return res.status(500).json({ message: "Failed to load request" });
  }

  res.json({ request: data || null });
});

export default router;
