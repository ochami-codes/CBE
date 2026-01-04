// routes/admin/role-requests/role-requests.js
import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from("role_requests")
      .select(`
        id,
        requested_role,
        status,
        created_at,
        requester:profiles!role_requests_requester_fkey(full_name),
        target_user:profiles!role_requests_target_user_fkey(id, full_name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
