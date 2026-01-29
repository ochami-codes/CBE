// backend/routes/admin/role-requests.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

/**
 * GET /admin/role-requests
 * List pending role requests for this church
 * Admin-only
 */
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const churchId = req.user.church_id;

  if (!churchId) {
    return res.status(400).json({ error: "Missing church context" });
  }

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

export default router;
