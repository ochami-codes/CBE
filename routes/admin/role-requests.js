import express from "express";

const router = express.Router();

/* =====================================================
   Helper: Role Management Access
===================================================== */
function requireRoleManagement(req, res) {
  const { permissions, is_member } = req.user;

  if (!is_member) {
    res.status(403).json({ error: "Members only" });
    return false;
  }

  if (!permissions.includes("manage_roles")) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  return true;
}

/**
 * GET /admin/role-requests
 */
router.get("/", async (req, res) => {
  if (!requireRoleManagement(req, res)) return;

  const supabase = req.supabase;
  const churchId = req.user.church_id;

  try {
    const { data, error } = await supabase
      .from("member_full_dashboard")
      .select(`
        role_request_id,
        requested_role,
        role_request_status,
        role_requested_at,
        full_name,
        email,
        role_name,
        role_requested_by_id,
        role_requested_by_name,
        role_requested_by_email
      `)
      .eq("church_id", churchId)
      .eq("role_request_status", "pending")
      .not("role_request_id", "is", null)
      .order("role_requested_at", { ascending: false });

    if (error) throw error;

    const shaped = (data || []).map((r) => ({
      id: r.role_request_id,
      requested_role: r.requested_role,
      role_request_status: r.role_request_status,
      role_requested_at: r.role_requested_at,

      target_user: {
        full_name: r.full_name,
        email: r.email,
        role: r.role_name,
      },

      requester: {
        id: r.role_requested_by_id,
        full_name: r.role_requested_by_name,
        email: r.role_requested_by_email,
      },
    }));

    res.json({ requests: shaped });
  } catch (err) {
    console.error("Fetch role requests error:", err);
    res.status(500).json({ error: "Failed to load role requests" });
  }
});

/**
 * POST /admin/role-requests/:id/approve
 */
router.post("/:id/approve", async (req, res) => {
  if (!requireRoleManagement(req, res)) return;

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
router.post("/:id/reject", async (req, res) => {
  if (!requireRoleManagement(req, res)) return;

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
