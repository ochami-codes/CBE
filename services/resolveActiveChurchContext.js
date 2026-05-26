import { normalizeRole, getUserPermissions } from "../config/roles.js";

export function resolveActiveChurchContext(req) {
  const activeChurchId = req.profile.active_church_id;

  if (!activeChurchId) {
    return null;
  }

  const activeMembership =
    req.memberships.find(
      (m) => m.church_id === activeChurchId
    ) || null;

  const isActiveMember =
    activeMembership?.status === "active";

  const roles = isActiveMember
    ? activeMembership?.member_roles?.map((r) =>
        normalizeRole(r.roles?.name)
      ) || []
    : ["guest"];

  const permissions = getUserPermissions(roles);

  const activeMembershipRequest =
    req.membershipRequests.find(
      (r) =>
        r.church_id === activeChurchId &&
        r.status === "requested"
    ) || null;

  return {
    activeChurchId,
    activeMembership,
    activeMembershipRequest,

    roles,
    permissions,

    isMember: isActiveMember,
    isPending: !!activeMembershipRequest,
    isSuspended:
      activeMembership?.status === "suspended",

    status: activeMembership?.status || "none",
    suspensionReason:
      activeMembership?.status_reason || null,
  };
}
