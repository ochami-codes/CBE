import express from "express";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

/**
 * GET /admin/role-requests
 * List pending role requests for this church
 */
router.get("/", requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const churchId = req.user.church_id;

  try {
    const { data, error } = await supabase
      .from("role_requests")
      .select(`
        id,
        requested_role,
        role_request_status,
        role_requested_at,
        requester:profiles!role_requests_requested_by_fkey(
          id,
          full_name,
          email
        ),
        member:profiles!role_requests_member_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq("church_id", churchId)
      .eq("role_request_status", "pending")
      .order("role_requested_at", { ascending: false });

    if (error) throw error;

    res.json({ requests: data ?? [] });
  } catch (err) {
    console.error("Fetch role requests error:", err);
    res.status(500).json({ error: "Failed to load role requests" });
  }
});

/**
 * POST /admin/role-requests/:id/approve
 */
router.post("/:id/approve", requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const adminId = req.user.id;

  try {
    const { data, error } = await supabase.rpc("handle_role_request", {
      p_request_id: id,
      p_action: "approved",
      p_admin_id: adminId,
    });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Approve role request RPC error:", err);
    res.status(400).json({
      error: err.message || "Failed to approve role request",
    });
  }
});
/**
 * POST /admin/role-requests/:id/reject
 */
router.post("/:id/reject", requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const adminId = req.user.id;

  try {
    const { data, error } = await supabase.rpc("handle_role_request", {
      p_request_id: id,
      p_action: "rejected",
      p_admin_id: adminId,
    });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Reject role request RPC error:", err);
    res.status(400).json({
      error: err.message || "Failed to reject role request",
    });
  }
});
export default router;
