import express from "express";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * ADD / UPSERT MEMBER
 * POST /members
 * Expects: { full_name, department (code), phone, role_name? }
 */
/**
 * Normalize Kenyan phone numbers to 2547XXXXXXXX format
 */
function normalizePhone(phone) {
  if (!phone) return null;

  phone = phone.replace(/\D/g, ""); // remove non-digits

  if (phone.startsWith("0")) {
    // 07xxxxxxxx → 2547xxxxxxxx
    phone = "254" + phone.slice(1);
  } else if (phone.startsWith("7") && phone.length === 9) {
    // 7xxxxxxxx → 2547xxxxxxxx
    phone = "254" + phone;
  } else if (phone.startsWith("+254")) {
    // +2547xxxxxxxx → 2547xxxxxxxx
    phone = phone.slice(1);
  }
  // else assume it's already normalized
  return phone;
}

router.post(
  "/",
  requireRole([
    "Admin",
    "Pastor",
    "Youth_leader",
    "Choir_leader",
    "Amo_leader",
    "Deaconry_leader",
    "Alo_leader",
  ]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;

    const {
      profile_id,
      full_name,
      phone,
      department,
      gender,
      role_name = "Member",
    } = req.body;

    if (!department) {
      return res.status(400).json({ message: "Department is required" });
    }

    if (!profile_id && (!full_name || !phone)) {
      return res.status(400).json({
        message: "Provide profile_id OR full_name + phone",
      });
    }

    const normalizedPhone = normalizePhone(phone);

    try {
      const { data, error } = await supabase.rpc("add_member_rpc", {
        p_church_id: church_id,
        p_profile_id: profile_id || null,
        p_full_name: full_name || null,
        p_gender: gender || null,
        p_phone: normalizedPhone || null,
        p_department_code: department,
        p_role_name: role_name,
      });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error("RPC error:", err);
      return res.status(500).json({ message: "Failed to add member" });
    }
  }
);
/**
 * UPDATE MEMBER
 */
router.put("/:id", requireRole(["Admin"]), async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { church_id } = req.user;

  const { full_name, department, role_name, email } = req.body;

  if (!full_name && !department && !role_name && !email) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const { data, error } = await supabase.rpc("update_member_rpc", {
      p_member_id: id,
      p_church_id: church_id,
      p_full_name: full_name || null,
      p_department_code: department || null,
      p_role_name: role_name || null,
      p_email: email || null,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("Update member error:", err);
    return res.status(500).json({ message: "Failed to update member" });
  }
});
/**
 * DELETE MEMBER
 */
router.delete(
  "/:id",
  
  requireRole(["Admin", "Pastor", "Youth_leader", "Deaconry_leader", "Amo_leader", "Alo_leader", "Choir_leader"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { church_id } = req.user;

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", id)
        .eq("church_id", church_id);

      if (error) throw error;

      return res.json({ message: "Member removed successfully" });
    } catch (err) {
      console.error("Delete member error:", err);
      return res.status(500).json({ message: "Failed to remove member" });
    }
  }
);

// Search profiles
router.get("/profiles/search", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ profiles: [] });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("church_id", church_id)
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);

    if (error) throw error;

    return res.json({ profiles: data ?? [] });
  } catch (err) {
    console.error("Search profiles error:", err);
    return res.status(500).json({ message: "Failed to search users" });
  }
});

export default router;

