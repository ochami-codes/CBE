// backend/routes/admin/role-requests/pending-count.js
import express from "express";

const router = express.Router();

/**
 * Helper: permission guard
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

/**
 * GET /admin/role-requests/pending-count
 * Returns number of pending role requests
 */
router.get(
  "/",
  requirePermission("access_role_requests"),
  async (req, res) => {
    const supabase = req.supabase;
    const churchId = req.user.church_id;

    if (!churchId) {
      return res.status(400).json({ error: "Missing church context" });
    }

    try {
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
  }
);

export default router;
