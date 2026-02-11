// routes/admin/admindashboard.js
import express from "express";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

/* ----------------------------------
   GET /admin/membership-requests
   Fetch all profiles, members, membership requests, and role requests
---------------------------------- */
router.get("/", requireAdmin, async (req, res) => {
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
});

export default router;
