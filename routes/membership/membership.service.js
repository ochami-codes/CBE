import { createMembershipRequest } from "./services/createMembershipRequest.js";
import { getMembershipRequests } from "./services/getMembershipRequests.js";
import { getMyMembershipRequest } from "./services/getMyMembershipRequest.js";
import { reviewMembershipRequest } from "./services/reviewMembershipRequest.js";

export const MembershipService = {
  createMembershipRequest,
  getMembershipRequests,
  getMyMembershipRequest,
  reviewMembershipRequest,
};