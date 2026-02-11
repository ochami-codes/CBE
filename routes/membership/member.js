// backend/routes/membership/member.js
import express from "express";

const router = express.Router();

/* ----------------------------------
   POST /membership-requests
   Logged-in user requests membership
---------------------------------- */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { id: profileId, church_id, is_member } = req.user;

  if (is_member) {
    return res.status(400).json({ message: "Already a member" });
  }

  if (!church_id) {
    return res.status(400).json({ message: "Church not selected" });
  }

  // Prevent duplicate pending request
  const { data: existing } = await supabase
    .from("membership_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ message: "Request already pending" });
  }

  const { error } = await supabase.from("membership_requests").insert({
    profile_id: profileId,
    church_id,
    status: "pending",
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

  const { data } = await supabase
    .from("membership_requests")
    .select("id, status, requested_at, reviewed_at")
    .eq("profile_id", profileId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  res.json({ request: data || null });
});

export default router;
