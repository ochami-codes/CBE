import express from "express";

const router = express.Router();

/* ---------------- Permission Helper ---------------- */
function requirePermission(user, permission) {
  return user?.permissions?.includes(permission);
}

/**
 * GET /members
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;
  const { department } = req.query;

  try {
    let { data, error } = await supabase
      .from("members")
      .select(`
        id,
        profile_id,
        role_name,
        active,
        created_at,
        profiles!inner (
          full_name,
          phone,
          gender,
          is_system_user
        ),
        member_departments (
          departments (
            name,
            code
          )
        )
      `)
      .eq("church_id", church_id)
      .order("full_name", { ascending: true, foreignTable: "profiles" });

    if (error) throw error;

    if (department) {
      data = data.filter((m) =>
        m.member_departments?.some(
          (md) => md.departments?.code === department
        )
      );
    }

    const members = (data || []).map((m) => ({
      id: m.id,
      profile_id: m.profile_id,
      full_name: m.profiles?.full_name || null,
      phone: m.profiles?.phone || null,
      gender: m.profiles?.gender || null,
      is_system_user: m.profiles?.is_system_user || false,
      department:
        m.member_departments?.map((md) => md.departments?.name) || [],
      role_name: m.role_name,
      active: m.active,
      created_at: m.created_at,
    }));

    return res.json({ members });
  } catch (err) {
    console.error("Fetch members error:", err);
    return res.status(500).json({ message: "Failed to fetch members" });
  }
});

/* ---------------- Phone Normalization ---------------- */
function normalizePhone(phone) {
  if (!phone) return null;

  phone = phone.replace(/\D/g, "");

  if (phone.startsWith("0")) {
    phone = "254" + phone.slice(1);
  } else if (phone.startsWith("7") && phone.length === 9) {
    phone = "254" + phone;
  } else if (phone.startsWith("+254")) {
    phone = phone.slice(1);
  }

  return phone;
}

/**
 * POST /members
 */
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  /* 🔒 Permission check (NEW PATTERN) */
  if (!requirePermission(req.user, "manage_members")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const {
    profile_id,
    full_name,
    phone,
    department,
    gender,
    role_name = "member",
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
});

/**
 * PUT /members/:id
 */
router.put("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { church_id } = req.user;

  /* 🔒 Admin-level action */
  if (!requirePermission(req.user, "access_admin_dashboard")) {
    return res.status(403).json({ message: "Admins only" });
  }

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
 * DELETE /members/:id
 */
router.delete("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;
  const { church_id } = req.user;

  /* 🔒 Permission check */
  if (!requirePermission(req.user, "manage_members")) {
    return res.status(403).json({ message: "Forbidden" });
  }

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
});

/**
 * GET /members/profiles/search
 */
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
