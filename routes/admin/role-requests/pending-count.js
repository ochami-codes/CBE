// routes/admin/role-requests/pending-count.js
import express from "express";
import { authMiddleware } from "../../../middleware/authMiddleware.js";
import requireAdmin from "../../../middleware/requireAdmin.js";

const router = express.Router();

/**
 * GET /admin/role-requests/pending-count
 * Admin-only — scoped to church
 */
router.get(
  "/",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    const supabase = req.supabase;
    const churchId = req.user.church_id;

    try {
      const { count, error } = await supabase
        .from("role_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("church_id", churchId);

      if (error) throw error;

      res.json({ count });
    } catch (err) {
      console.error("Pending role requests count error:", err);
      res.status(500).json({
        message: "Failed to fetch pending role requests count",
      });
    }
  }
);

export default router;
