// middleware/buildUserContext.js
import { normalizeRole, getUserPermissions } from "../config/roles.js";

export function buildUserContext(req, res, next) {
  const activeChurchId = req.profile.active_church_id;

  /* -------------------------------
     ACTIVE MEMBERSHIP (derived)
  ------------------------------- */
  const activeMembership =
    req.memberships.find(
      (m) => m.church_id === activeChurchId
    ) || null;

  /* -------------------------------
     ROLE COLLECTION (from ALL memberships)
  ------------------------------- */
  const roleSet = new Set();

  req.memberships
    .filter((m) => m.status === "active")
    .forEach((m) => {
      (m.member_roles || []).forEach((r) => {
        roleSet.add(normalizeRole(r.roles?.name));
      });
    });

  const roles =
    roleSet.size > 0 ? [...roleSet] : ["guest"];

  /* -------------------------------
     REQUESTS BY CHURCH (array-first view)
  ------------------------------- */
  const requestsByChurch = req.membershipRequests || [];

  /* -------------------------------
     FINAL USER OBJECT
  ------------------------------- */
  req.user = {
    id: req.profile.id,
    auth_user_id: req.authUser.id,

    email: req.profile.email,
    full_name: req.profile.full_name,

    /* -------------------------------
       CORE ARRAYS (source of truth)
    ------------------------------- */
    memberships: req.memberships,
    membership_requests: requestsByChurch,
    roles,

    /* -------------------------------
       ACTIVE CONTEXT (derived)
    ------------------------------- */
    active_church_id: activeChurchId,
    active_membership: activeMembership,
    active_membership_status:
      activeMembership?.status || "guest",

    /* -------------------------------
       PERMISSIONS (derived from roles)
    ------------------------------- */
    permissions: getUserPermissions(roles),

    /* -------------------------------
       FLAGS (UI convenience only)
    ------------------------------- */
    is_member: activeMembership?.status === "active",
    is_pending: activeMembership?.status === "requested",
  };

  next();
}
