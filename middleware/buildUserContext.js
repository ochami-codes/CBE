import { resolveActiveChurchContext } from "../services/resolveActiveChurchContext.js";

export function buildUserContext(req, res, next) {
  const ctx = resolveActiveChurchContext(req);

  /* --------------------------------
     GUARD: NO ACTIVE CHURCH
  -------------------------------- */
  if (!ctx) {
    return res.status(400).json({
      message: "No active church selected",
    });
  }

  /* --------------------------------
     BUILD USER RESPONSE (NO LOGIC)
  -------------------------------- */
  req.user = {
    id: req.profile.id,
    auth_user_id: req.authUser.id,
    email: req.profile.email,
    full_name: req.profile.full_name,

    memberships: req.memberships,
    membership_requests: req.membershipRequests,

    active_church_id: ctx.activeChurchId,
    active_church_name: req.profile.active_church_name,

    church_id: ctx.activeChurchId, // alias (optional)

    active_membership: ctx.activeMembership,
    active_membership_request: ctx.activeMembershipRequest,

    roles: ctx.roles,
    permissions: ctx.permissions,

    active_membership_status: ctx.status,

    is_member: ctx.isMember,
    is_pending: ctx.isPending,
    is_suspended: ctx.isSuspended,

    suspension_reason: ctx.suspensionReason,
  };

  next();
}