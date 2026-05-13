// middleware/buildUserContext.js
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

  const activeMembership =
    req.memberships.find(
      (m) =>
        m.church_id ===
        activeChurchId
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

    active_membership:
      activeMembership,

    /* church-scoped */
    roles: roleArray,

    permissions,

    active_membership_status:
      activeMembership?.status ||
      "guest",

    is_member:
      activeMembership?.status ===
      "active",

    is_pending:
      activeMembership?.status ===
      "requested",
  };

  next();
}
