// middleware/userContext.js

import { authMiddleware } from "./authMiddleware.js";
import { loadProfile } from "./loadProfile.js";
import { loadMemberships } from "./loadMemberships.js";
import { loadMembershipRequests } from "./loadMembershipRequests.js";
import { buildUserContext } from "./buildUserContext.js";

/**
 * Single middleware stack exported to routes
 */
export const userContext = [
  authMiddleware,
  loadProfile,
  loadMemberships,
  loadMembershipRequests,
  buildUserContext,
];
