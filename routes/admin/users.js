// routes/admin/users.js
import express from "express";

const router = express.Router();

/**
 * Helper: check permission
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
 * POST /admin/users/:id/deactivate
 */
router.post(
  "/:id/deactivate",
  requirePermission("manage_users"),
  async (req, res) => {
    const supabase = req.supabase;
    const targetMemberId = req.params.id;
    const adminId = req.user.id;
    const churchId = req.user.church_id;

    if (adminId === targetMemberId) {
      return res.status(400).json({
        message: "You cannot deactivate yourself.",
      });
    }

    try {
      // 1️⃣ Fetch member
      const { data: member, error } = await supabase
        .from("members")
        .select("id, status")
        .eq("id", targetMemberId)
        .eq("church_id", churchId)
        .single();

      if (error || !member) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (member.status !== "active") {
        return res.status(400).json({
          message: `User already ${member.status}`,
        });
      }

      // 2️⃣ Update status → inactive
      const { error: updateError } = await supabase
        .from("members")
        .update({
          status: "inactive",
          deactivated_at: new Date().toISOString(),
        })
        .eq("id", member.id)
        .eq("church_id", churchId);

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

/**
 * POST /admin/users/:id/activate
 */
router.post(
  "/:id/activate",
  requirePermission("manage_users"),
  async (req, res) => {
    const supabase = req.supabase;
    const targetMemberId = req.params.id;
    const churchId = req.user.church_id;

    try {
      const { data: member, error } = await supabase
        .from("members")
        .select("id, status")
        .eq("id", targetMemberId)
        .eq("church_id", churchId)
        .single();

      if (error || !member) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (member.status === "active") {
        return res.status(400).json({
          message: "User is already active",
        });
      }

      // 2️⃣ Update status → active
      const { error: updateError } = await supabase
        .from("members")
        .update({
          status: "active",
          deactivated_at: null,
        })
        .eq("id", member.id)
        .eq("church_id", churchId);

      if (updateError) throw updateError;

      res.json({
        success: true,
        message: "User reactivated successfully",
      });

    } catch (err) {
      console.error("Activate user error:", err);
      res.status(500).json({
        message: "Failed to activate user",
      });
    }
  }
);

export default router;
