import express from "express";
const router = express.Router();

/* =====================================================
   POST /membership-requests
   Logged-in user requests membership
===================================================== */
router.post("/", async (req, res) => {
  const supabase = req.supabase;

  const userId = req.user.id; // from your auth middleware
  const { churchId } = req.body;

  const { data, error } = await supabase.rpc(
    "create_membership_request",
    {
      p_profile_id: userId,
      p_church_id: churchId,
    }
  );

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  res.status(201).json(data);
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
  const { id } = req.params;
  const { action } = req.body;

  const { data, error } = await supabase.rpc(
    "respond_to_membership_invite",
    {
      p_request_id: id,
      p_action: action
    }
  );

  if (error) {
    return res.status(400).json({
      message: error.message
    });
  }

  res.json(data);
});
export default router;
