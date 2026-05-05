import { supabaseAdmin } from "../supabaseClient.js";
import { getUserPermissions, normalizeRole } from "../config/roles.js";

export const getUserContext = async (token) => {
  /* ---------------- Token ---------------- */
  const {
    data: { user: authUser },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    return null;
  }

  const userId = authUser.id;

  /* ---------------- Profile ---------------- */
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      phone,
      active_church_id
    `)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
    return null;
  }

  // ❌ NO FALLBACK CREATION — PROFILE MUST EXIST
  if (!profile) {
    console.warn("Profile missing for auth user:", userId);
    return null;
  }

  const profileId = profile.id;

  /* ---------------- Memberships ---------------- */
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

  /* ---------------- Roles ---------------- */
  const roleSet = new Set();

  memberships?.forEach((m) => {
    const names =
      m.member_roles?.map((r) => r.roles?.name) || [];

    names.forEach((name) =>
      roleSet.add(normalizeRole(name))
    );
  });

  const roles =
    roleSet.size > 0 ? [...roleSet] : ["guest"];

  const permissions = getUserPermissions(roles);

  /* ---------------- Active Church ---------------- */
  const activeMembership =
    memberships?.find(
      (m) => m.church_id === profile.active_church_id
    ) || null;

  const activeChurch = activeMembership
    ? {
        id: activeMembership.church_id,
        name: activeMembership.churches?.name,
      }
    : null;

  /* ---------------- Membership Requests ---------------- */
  const { data: requests } = await supabaseAdmin
    .from("membership_requests")
    .select("membership_request_status")
    .eq("profile_id", profileId)
    .order("membership_requested_at", {
      ascending: false,
    })
    .limit(1);

  const latestRequest = requests?.[0] ?? null;

  /* ---------------- Final Object ---------------- */
  return {
    id: profile.id,
    auth_user_id: profile.auth_user_id,
    email: profile.email,
    phone: profile.phone,
    full_name:
      profile.full_name ||
      authUser.email?.split("@")[0] ||
      "User",

    roles,
    permissions,
    role_name: roles[0],

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
  };
};
