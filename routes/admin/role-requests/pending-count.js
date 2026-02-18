// backend/routes/admin/role-requests/pending-count.js
import express from "express";
import requireAdmin from "../../../middleware/requireAdmin.js";

const router = express.Router();

/**
 * GET /admin/role-requests/pending-count
 * Returns the number of pending role requests for the admin's church
 */
router.get("/", requireAdmin, async (req, res) => {
  const supabase = req.supabase;
  const churchId = req.user.church_id;

  if (!churchId) {
    return res.status(400).json({ error: "Missing church context" });
  }

  try {
    // Count pending requests scoped to this church
    const { count, error } = await supabase
      .from("role_requests")
      .select("*", { count: "exact", head: true })
      .eq("role_request_status", "pending")
      .eq("church_id", churchId);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Pending role requests count error:", err);
    res.status(500).json({
      error: "Failed to fetch pending role requests count",
    });
  }
});

export default router;
