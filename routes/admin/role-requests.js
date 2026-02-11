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
        status,
        created_at,
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
      .eq("status", "pending")
      .order("created_at", { ascending: false });

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
router.post(
  "/:id/approve",
  
  requireAdmin,
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;

    try {
      // 1️⃣ Load the request
      const { data: request, error } = await supabase
        .from("role_requests")
        .select("id, requested_role, member_id, church_id")
        .eq("id", id)
        .single();

      if (error || !request) {
        return res.status(404).json({ error: "Role request not found" });
      }

      // 2️⃣ Update member role
      const { error: memberError } = await supabase
        .from("members")
        .update({ role_name: request.requested_role })
        .eq("id", request.member_id)
        .eq("church_id", request.church_id);

      if (memberError) throw memberError;

      // 3️⃣ Mark request approved
      const { error: requestError } = await supabase
        .from("role_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (requestError) throw requestError;

      res.json({ message: "Role request approved" });
    } catch (err) {
      console.error("Approve role request error:", err);
      res.status(500).json({ error: "Failed to approve role request" });
    }
  }
);

/**
 * POST /admin/role-requests/:id/reject
 */
router.post(
  "/:id/reject",
  
  requireAdmin,
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;

    try {
      const { error } = await supabase
        .from("role_requests")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      res.json({ message: "Role request rejected" });
    } catch (err) {
      console.error("Reject role request error:", err);
      res.status(500).json({ error: "Failed to reject role request" });
    }
  }
);

export default router;
