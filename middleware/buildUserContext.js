// middleware/buildUserContext.js
import { normalizeRole } from "../config/roles.js";
import { getUserPermissions } from "../config/roles.js";
export function buildUserContext(req, res, next) {
  const activeChurchId = req.profile.active_church_id;

  /* --------------------------------
     GUARD: NO ACTIVE CHURCH
  -------------------------------- */
  if (!activeChurchId) {
    return res.status(400).json({
      message: "No active church selected",
    });
  }

  /* --------------------------------
     FIND MEMBERSHIP IN ACTIVE CHURCH
  -------------------------------- */
  const activeMembership =
    req.memberships.find(
      (m) => m.church_id === activeChurchId
    ) || null;

  /* --------------------------------
     ONLY ACTIVE MEMBERSHIP CAN DRIVE ROLE ACCESS
  -------------------------------- */
  const isActiveMember =
    activeMembership?.status === "active";

  const roleArray =
    isActiveMember
      ? activeMembership?.member_roles?.map((r) =>
          normalizeRole(r.roles?.name)
        ) || []
      : ["guest"];

  const permissions = getUserPermissions(roleArray);

  /* --------------------------------
     ACTIVE MEMBERSHIP REQUEST
  -------------------------------- */
  const activeMembershipRequest =
    req.membershipRequests.find(
      (r) =>
        r.church_id === activeChurchId &&
        r.status === "requested"
    ) || null;

  /* --------------------------------
     BUILD USER CONTEXT
  -------------------------------- */
  req.user = {
    id: req.profile.id,
    auth_user_id: req.authUser.id,
    email: req.profile.email,
    full_name: req.profile.full_name,

    memberships: req.memberships,
    membership_requests: req.membershipRequests,

    active_church_name: req.profile.active_church_name,
    active_church_id: activeChurchId,

    church_id: activeChurchId, // alias (temporary)

    active_membership: activeMembership,
    active_membership_request: activeMembershipRequest,

    roles: roleArray,
    permissions,

    active_membership_status:
      activeMembership?.status || "none",

    is_member: isActiveMember,
    is_pending: !!activeMembershipRequest,

    is_suspended:
      activeMembership?.status === "suspended",
    suspension_reason:
    activeMembership?.status_reason || null,
  };

  next();
}
