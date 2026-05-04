import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";
import { getUserPermissions, normalizeRole } from "../../config/roles.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    // ---------------- Token Validation ----------------
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    const userId = authUser.id;

    // ---------------- Profile ----------------
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        auth_user_id,
        full_name,
        email,
        phone,
        is_member
      `)
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(200).json({ user: null });
    }

    const profileId = profile.id;

    // ---------------- Memberships ----------------
    const { data: memberships } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        status,
        church_id,
        member_roles (
          roles (
            name
          )
        ),
        churches (
          name
        )
      `)
      .eq("profile_id", profileId);

    // ---------------- Role Aggregation ----------------
    const roleSet = new Set();

    memberships?.forEach((m) => {
      const names =
        m.member_roles?.map((r) => r.roles?.name) || [];

      names.forEach((name) => {
        roleSet.add(normalizeRole(name));
      });
    });

    const roleArray =
      roleSet.size > 0 ? [...roleSet] : ["guest"];

    const permissions = getUserPermissions(roleArray);

    // ---------------- Active Church ----------------
    const activeMembership =
      memberships?.find((m) => m.status === "active") || null;

    const activeChurch = activeMembership?.churches || null;

    // ---------------- Membership Requests ----------------
    const { data: requests } = await supabaseAdmin
      .from("membership_requests")
      .select("membership_request_status")
      .eq("profile_id", profileId)
      .order("membership_requested_at", { ascending: false })
      .limit(1);

    const latestRequest = requests?.[0] ?? null;

    // ---------------- Response ----------------
    return res.status(200).json({
      user: {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        email: profile.email,
        phone: profile.phone,
        full_name:
          profile.full_name ||
          authUser.email?.split("@")[0] ||
          "Guest",

        roles: roleArray,
        permissions,
        role_name: roleArray[0],

        memberships:
          memberships?.map((m) => ({
            id: m.id,
            church_id: m.church_id,
            church_name: m.churches?.name,
            status: m.status,
            roles:
              m.member_roles?.map(
                (r) => r.roles?.name
              ) || [],
          })) || [],

        active_church: activeChurch,
        is_member: (memberships?.length || 0) > 0,
        membership_status:
          (memberships?.length || 0) > 0
            ? "approved"
            : latestRequest?.membership_request_status ||
              "none",
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
