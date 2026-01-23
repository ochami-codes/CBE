// backend/routes/admin/role-requests/role-requests.js
import express from "express";

const router = express.Router();

/**
 * GET /admin/role-requests
 * List pending role requests for this church
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  if (!church_id) {
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
        requester:profiles!role_requests_requester_fkey(
          id,
          full_name
        ),
        target_user:profiles!role_requests_target_user_fkey(
          id,
          full_name
        )
      `)
      .eq("church_id", church_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      requests: data ?? [],
    });
  } catch (err) {
    console.error("Fetch role requests error:", err);
    res.status(500).json({
      error: "Failed to load role requests",
    });
  }
});

export default router;
