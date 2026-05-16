// routes/members.js

import express from "express";

const router = express.Router();

/* =====================================================
   HELPERS
===================================================== */

function requirePermission(user, permission) {
  if (!user) return false;

  if (user.roles?.includes("admin")) {
    return true;
  }

  return user.permissions?.includes(permission);
}

function normalizePhone(phone) {
  if (!phone) return null;

  phone = phone.replace(/\D/g, "");

  if (phone.startsWith("0")) {
    phone = "254" + phone.slice(1);
  } else if (
    phone.startsWith("7") &&
    phone.length === 9
  ) {
    phone = "254" + phone;
  }

  return phone;
}

/* =====================================================
   GET /members
===================================================== */

router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const churchId =
    req.user.active_church_id;

  const {
    search,
    department,
  } = req.query;

  try {
    let query = supabase
      .from("members")
      .select(`
        id,
        profile_id,
        status,
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
        ),

        member_roles (
          roles (
            name
          )
        )
      `)
      .eq("church_id", churchId)
      .order("full_name", {
        ascending: true,
        foreignTable: "profiles",
      });

    if (search?.trim()) {
      query = query.or(
        `full_name.ilike.%${search}%,
         phone.ilike.%${search}%`,
        {
          foreignTable:
            "profiles",
        }
      );
    }

    const { data, error } =
      await query;

    if (error) throw error;

    let members =
      (data || []).map((m) => {
        const departments =
          m.member_departments?.map(
            (d) =>
              d.departments?.name
          ) || [];

        const roles =
          m.member_roles?.map(
            (r) =>
              r.roles?.name
          ) || [];

        return {
          id: m.id,
          profile_id:
            m.profile_id,

          full_name:
            m.profiles?.full_name,

          phone:
            m.profiles?.phone,

          gender:
            m.profiles?.gender,

          is_system_user:
            m.profiles
              ?.is_system_user ||
            false,

          departments,

          roles,

          primary_role:
            roles[0] ||
            "member",

          status: m.status,

          active:
            m.status ===
            "active",

          created_at:
            m.created_at,
        };
      });

    if (department) {
      members =
        members.filter((m) =>
          m.departments.includes(
            department
          )
        );
    }

    return res.json({
      members,
    });
  } catch (err) {
    console.error(
      "Fetch members:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to fetch members",
    });
  }
});

/* =====================================================
   POST /members
===================================================== */

router.post("/", async (req, res) => {
  const supabase =
    req.supabase;

  const churchId =
    req.user.active_church_id;

  if (
    !requirePermission(
      req.user,
      "manage_members"
    )
  ) {
    return res
      .status(403)
      .json({
        message:
          "Forbidden",
      });
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
    return res
      .status(400)
      .json({
        message:
          "Department required",
      });
  }

  const normalizedPhone =
    normalizePhone(phone);

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "add_member_rpc",
      {
        p_church_id:
          churchId,

        p_profile_id:
          profile_id ||
          null,

        p_full_name:
          full_name ||
          null,

        p_gender:
          gender ||
          null,

        p_phone:
          normalizedPhone ||
          null,

        p_department_code:
          department,

        p_role_name:
          role_name,
      }
    );

    if (error) {
      return res
        .status(400)
        .json({
          message:
            error.message,
        });
    }

    return res
      .status(201)
      .json(data);
  } catch (err) {
    console.error(
      "Add member:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to add member",
    });
  }
});

/* =====================================================
   PUT /members/:id
===================================================== */

router.put(
  "/:id",
  async (req, res) => {
    const supabase =
      req.supabase;

    const churchId =
      req.user.active_church_id;

    const { id } =
      req.params;

    if (
      !requirePermission(
        req.user,
        "access_admin_dashboard"
      )
    ) {
      return res
        .status(403)
        .json({
          message:
            "Admins only",
        });
    }

    const {
      full_name,
      department,
      role_name,
      email,
    } = req.body;

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "update_member_rpc",
          {
            p_member_id:
              id,

            p_church_id:
              churchId,

            p_full_name:
              full_name ||
              null,

            p_department_code:
              department ||
              null,

            p_role_name:
              role_name ||
              null,

            p_email:
              email ||
              null,
          }
        );

      if (error) {
        return res
          .status(400)
          .json({
            message:
              error.message,
          });
      }

      return res.json(data);
    } catch (err) {
      console.error(
        "Update member:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to update member",
      });
    }
  }
);

/* =====================================================
   DELETE /members/:id
===================================================== */

router.delete(
  "/:id",
  async (req, res) => {
    const supabase =
      req.supabase;

    const churchId =
      req.user.active_church_id;

    const { id } =
      req.params;

    if (
      !requirePermission(
        req.user,
        "manage_members"
      )
    ) {
      return res
        .status(403)
        .json({
          message:
            "Forbidden",
        });
    }

    try {
      const { error } =
        await supabase
          .from("members")
          .update({
            status:
              "removed",

            status_reason:
              "manual removal",
          })
          .eq("id", id)
          .eq(
            "church_id",
            churchId
          );

      if (error)
        throw error;

      return res.json({
        message:
          "Member removed",
      });
    } catch (err) {
      console.error(
        "Delete member:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to remove member",
      });
    }
  }
);

export default router;
