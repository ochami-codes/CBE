// routes/admin/users.js
import express from "express";
import requireAdmin from "../../middleware/requireAdmin.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /admin/users/:id/deactivate
 */
router.post(
  "/:id/deactivate",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    const supabase = req.supabase;
    const targetUserId = req.params.id;
    const adminId = req.user.id;
    const churchId = req.user.church_id;

    // Prevent self-deactivation
    if (adminId === targetUserId) {
      return res.status(400).json({
        message: "You cannot deactivate yourself.",
      });
    }

    try {
      // Ensure target user exists & belongs to same church
      const { data: user, error: fetchError } = await supabase
        .from("profiles")
        .select("id, is_active")
        .eq("id", targetUserId)
        .eq("church_id", churchId)
        .single();

      if (fetchError || !user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.is_active === false) {
        return res.status(400).json({
          message: "User is already deactivated",
        });
      }

      // Deactivate
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      res.json({
        success: true,
        message: "User deactivated successfully",
      });
    } catch (err) {
      console.error("Deactivate user error:", err);
      res.status(500).json({
        message: "Failed to deactivate user",
      });
    }
  }
);

export default router;
