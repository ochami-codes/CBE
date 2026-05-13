// middleware/buildUserContext.js
import { normalizeRole, getUserPermissions } from "../config/roles.js";

export function buildUserContext(req, res, next) {
  const activeChurchId = req.profile.active_church_id;

  const activeMembership =
    req.memberships.find(
      (m) => m.church_id === activeChurchId
    );

  const roles = new Set();

  req.memberships
    .filter((m) => m.status === "active")
    .forEach((m) => {
      (m.member_roles || []).forEach((r) => {
        roles.add(normalizeRole(r.roles?.name));
      });
    });

  const roleArray =
    roles.size > 0 ? [...roles] : ["guest"];

  req.user = {
    id: req.profile.id,
    auth_user_id: req.authUser.id,

    email: req.profile.email,
    full_name: req.profile.full_name,

    active_church_id: activeChurchId,

    memberships: req.memberships,
    membership_requests: req.membershipRequests,

    active_membership: activeMembership || null,

    roles: roleArray,
    permissions: getUserPermissions(roleArray),

    is_member: activeMembership?.status === "active",
    active_membership_status:
      activeMembership?.status || "guest",
  };

  next();
}
