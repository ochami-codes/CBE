// middleware/buildUserContext.js

export function buildUserContext(req, res, next) {
  const activeChurch =
    req.churchContext?.activeChurch ?? null;

  const churches =
    req.churchContext?.churches ?? [];

  req.user = {
    // -----------------------------------------
    // User identity
    // -----------------------------------------

    id: req.profile.id,
    auth_user_id: req.authUser.id,
    email: req.profile.email,
    full_name: req.profile.full_name,

    // -----------------------------------------
    // Churches user belongs to
    // -----------------------------------------

    churches,

    // -----------------------------------------
    // Membership requests
    // -----------------------------------------

    membership_requests:
      req.membershipRequests ?? [],

    // -----------------------------------------
    // Active church
    // -----------------------------------------

    active_church: activeChurch,

    active_church_id:
      activeChurch?.id ?? null,

    active_church_name:
      activeChurch?.name ?? null,

    // -----------------------------------------
    // Active membership
    // -----------------------------------------

    active_member_id:
      activeChurch?.membershipId ?? null,

    active_membership_status:
      activeChurch?.status ?? "none",

    // -----------------------------------------
    // Membership state
    // -----------------------------------------

    is_member:
      activeChurch?.status === "active",

    is_pending:
      activeChurch?.status === "pending",

    is_suspended:
      activeChurch?.status === "suspended",
  };

  next();
}