// routes/admin/users.js
import express from "express";

const router = express.Router();

/**
 * Permission guard
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
 * Helper: fetch member scoped to church
 */
async function getMember(supabase, memberId, churchId) {
  const { data, error } = await supabase
    .from("members")
    .select("id, status")
    .eq("id", memberId)
    .eq("church_id", churchId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * POST /admin/users/:id/suspend
 */
router.post(
  "/:id/suspend",
  requirePermission("manage_users"),
  async (req, res) => {
    const supabase = req.supabase;
    const targetMemberId = req.params.id;
    const adminId = req.user.id;
    const churchId = req.user.active_church_id;

    const { reason } = req.body; // optional

    if (adminId === targetMemberId) {
      return res.status(400).json({
        message: "You cannot suspend yourself.",
      });
    }

    try {
      const member = await getMember(supabase, targetMemberId, churchId);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (member.status === "suspended") {
        return res.status(400).json({
          message: "User is already suspended",
        });
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({
          status: "suspended",
          status_reason: reason || "admin suspension",
          suspended_at: new Date().toISOString(),
        })
        .eq("id", member.id)
        .eq("church_id", churchId);

      if (updateError) throw updateError;

      return res.json({
        success: true,
        message: "User suspended successfully",
      });
    } catch (err) {
      console.error("Suspend user error:", err);
      return res.status(500).json({
        message: "Failed to suspend user",
      });
    }
  }
);

/**
 * POST /admin/users/:id/unsuspend
 */
router.post(
  "/:id/unsuspend",
  requirePermission("manage_users"),
  async (req, res) => {
    const supabase = req.supabase;
    const targetMemberId = req.params.id;
    const churchId = req.user.active_church_id;

    try {
      const member = await getMember(supabase, targetMemberId, churchId);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (member.status !== "suspended") {
        return res.status(400).json({
          message: `User is not suspended (current: ${member.status})`,
        });
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({
          status: "active",
          status_reason: null,
          suspended_at: null,
        })
        .eq("id", member.id)
        .eq("church_id", churchId);

      if (updateError) throw updateError;

      return res.json({
        success: true,
        message: "User reactivated successfully",
      });
    } catch (err) {
      console.error("Unsuspend user error:", err);
      return res.status(500).json({
        message: "Failed to reactivate user",
      });
    }
  }
);

export default router;
