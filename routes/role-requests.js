import express from "express";

const router = express.Router();

const ALLOWED_ROLES = [
  "Admin",
  "Pastor",
  "Treasurer",
  "Children_leader",
  "Youth_leader",
  "Communication_leader",
];

router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { requested_role } = req.body;

  const { id: member_id, church_id, is_member } = req.user;

  if (!is_member) {
    return res.status(403).json({
      error: "Only members can request roles",
    });
  }

  if (!church_id) {
    return res.status(400).json({
      error: "Church not set",
    });
  }

  if (!requested_role) {
    return res.status(400).json({
      error: "requested_role is required",
    });
  }

  if (!ALLOWED_ROLES.includes(requested_role)) {
    return res.status(400).json({
      error: "Invalid requested_role",
    });
  }

  try {
    const { data, error } = await supabase.rpc("submit_role_request", {
      p_member_id: member_id,
      p_requested_role: requested_role,
      p_church_id: church_id,
    });

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Submit role request RPC error:", err);

    res.status(400).json({
      error: err.message || "Failed to submit role request",
    });
  }
});
/**
 * GET /role-requests/my-requests
 * Fetch logged-in member's role requests
 */
router.get("/my-requests", async (req, res) => {
  const supabase = req.supabase;
  const { id: member_id, is_member } = req.user;

  if (!is_member) {
    return res.json({ requests: [] });
  }

  try {
    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .eq("member_id", member_id)
      .order("role_requested_at", { ascending: false });

    if (error) throw error;

    res.json({ requests: data || [] });
  } catch (err) {
    console.error("Fetch member role requests error:", err);
    res.status(500).json({
      error: "Failed to fetch your role requests",
    });
  }
});

export default router;
