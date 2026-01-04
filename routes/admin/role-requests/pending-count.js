// routes/admin/role-requests/pending-count.js
import express from "express";

const router = express.Router();

// GET /admin/role-requests/pending-count
router.get("/", async (req, res) => {
  try {
    const { count, error } = await req.supabase
      .from("role_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) throw error;

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
