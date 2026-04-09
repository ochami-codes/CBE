import express from "express";
import {
  normalizeRole,
  isValidRole,
  REQUESTABLE_ROLES,
} from "../config/roles.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const supabase = req.supabase;
  let { requested_role } = req.body;

  const { member_id, church_id, is_member } = req.user;

  // ------------------------------------
  // VALIDATIONS
  // ------------------------------------

  if (!is_member) {
    return res.status(403).json({
      error: "Only members can request roles",
    });
  }

  if (!member_id) {
    return res.status(400).json({
      error: "Member record not found",
    });
  }

  if (!church_id) {
    return res.status(400).json({
      error: "Church not set",
    });
  }

  if (!requested_role) {
    return res.status(400).json({
      error: "requested_role is required",
    });
  }

  // Normalize role (Admin → admin, etc.)
  requested_role = normalizeRole(requested_role);

  // ✅ Validate role exists
  if (!isValidRole(requested_role)) {
    return res.status(400).json({
      error: "Invalid role",
    });
  }

  // ✅ Ensure role is requestable (no admin, guest, etc.)
  if (!REQUESTABLE_ROLES.includes(requested_role)) {
    return res.status(403).json({
      error: "You cannot request this role",
    });
  }

  try {
    const { data, error } = await supabase.rpc("submit_role_request", {
      p_member_id: member_id,
      p_requested_role: requested_role,
      p_church_id: church_id,
    });

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Submit role request RPC error:", err);

    res.status(400).json({
      error: err.message || "Failed to submit role request",
    });
  }
});

/**
 * GET /role-requests/my-requests
 */
router.get("/my-requests", async (req, res) => {
  const supabase = req.supabase;
  const { id: member_id, is_member } = req.user;

  if (!is_member) {
    return res.json({ requests: [] });
  }

  try {
    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .eq("member_id", member_id)
      .order("role_requested_at", { ascending: false });

    if (error) throw error;

    res.json({ requests: data || [] });
  } catch (err) {
    console.error("Fetch member role requests error:", err);
    res.status(500).json({
      error: "Failed to fetch your role requests",
    });
  }
});

export default router;
