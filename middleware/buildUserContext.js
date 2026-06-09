import { resolveActiveChurchContext } from "../services/resolveActiveChurchContext.js";

export function buildUserContext(req, res, next) {
  const ctx = resolveActiveChurchContext(req);

  // IMPORTANT: do NOT block request if ctx is missing

  req.user = {
    id: req.profile.id,
    auth_user_id: req.authUser.id,
    email: req.profile.email,
    full_name: req.profile.full_name,

    memberships: req.memberships ?? [],
    membership_requests: req.membershipRequests ?? [],

    active_church_id: ctx?.activeChurchId ?? null,
    active_church_name: req.profile.active_church_name ?? null,

    church_id: ctx?.activeChurchId ?? null,

    active_membership: ctx?.activeMembership ?? null,
    active_membership_request: ctx?.activeMembershipRequest ?? null,

    roles: ctx?.roles ?? [],
    permissions: ctx?.permissions ?? [],

    active_membership_status: ctx?.status ?? "none",

    is_member: ctx?.isMember ?? false,
    is_pending: ctx?.isPending ?? false,
    is_suspended: ctx?.isSuspended ?? false,

    suspension_reason: ctx?.suspensionReason ?? null,
  };

  next();
}