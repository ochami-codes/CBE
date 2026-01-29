// routes/role-requests.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /role-requests
 * Member submits a role request
 */
router.post("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { requested_role } = req.body;
  const member_id = req.user.id;
  const church_id = req.user.church_id;

  if (!requested_role) {
    return res.status(400).json({ error: "requested_role is required" });
  }

  try {
    const { data, error } = await supabase
      .from("role_requests")
      .insert([{ requested_role, member_id, church_id, status: "pending" }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Submit role request error:", err);
    res.status(500).json({ error: "Failed to submit role request" });
  }
});

/**
 * GET /role-requests/my-requests
 * Fetch logged-in member's requests
 */
router.get("/my-requests", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const member_id = req.user.id;

  try {
    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .eq("member_id", member_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data ?? []);
  } catch (err) {
    console.error("Fetch member role requests error:", err);
    res.status(500).json({ error: "Failed to fetch your role requests" });
  }
});

export default router;
