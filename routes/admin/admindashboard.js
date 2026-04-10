// routes/admin/admindashboard.js
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

/* ----------------------------------
   GET /admin/dashboard
   Fetch all profiles, members, membership requests, and role requests
---------------------------------- */
router.get(
  "/",
  requirePermission("access_admin_dashboard"),
  async (req, res) => {
    const supabase = req.supabase;

    try {
      const { data, error } = await supabase
        .from("member_full_dashboard")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Fetch admin dashboard view error:", error);
        return res.status(500).json({ error: "Failed to fetch dashboard data" });
      }

      res.json({ data });
    } catch (err) {
      console.error("Admin dashboard endpoint error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
