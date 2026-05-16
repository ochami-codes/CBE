// middleware/buildUserContext.js

import {
  normalizeRole,
  getUserPermissions,
} from "../config/roles.js";

export function buildUserContext(
  req,
  res,
  next
) {
  const activeChurchId =
    req.profile.active_church_id;

  /* --------------------------------
     ACTIVE MEMBERSHIP
  -------------------------------- */

  const activeMembership =
    req.memberships.find(
      (m) =>
        m.church_id ===
        activeChurchId
    ) || null;

  /* --------------------------------
     ACTIVE MEMBERSHIP REQUEST
  -------------------------------- */

  const activeMembershipRequest =
    req.membershipRequests.find(
      (r) =>
        r.church_id ===
          activeChurchId &&
        r.status === "requested"
    ) || null;

  /* --------------------------------
     ACTIVE CHURCH ROLES ONLY
  -------------------------------- */

  const roleArray =
    activeMembership?.member_roles?.map(
      (r) =>
        normalizeRole(
          r.roles?.name
        )
    ) || ["guest"];

  const permissions =
    getUserPermissions(
      roleArray
    );

  req.user = {
    id: req.profile.id,

    auth_user_id:
      req.authUser.id,

    email: req.profile.email,

    full_name:
      req.profile.full_name,

    memberships:
      req.memberships,

    membership_requests:
      req.membershipRequests,

    active_church_id:
      activeChurchId,
   church_id: activeChurchId, // an alias( tempirary)
    active_membership:
      activeMembership,

    active_membership_request:
      activeMembershipRequest,

    /* --------------------------------
       CHURCH-SCOPED AUTH
    -------------------------------- */

    roles: roleArray,

    permissions,

    active_membership_status:
      activeMembership?.status ||
      "guest",

    is_member:
      activeMembership?.status ===
      "active",

    /* request-based */
    is_pending:
      !!activeMembershipRequest,
  };

  next();
}
