import { getRoleRequests } from "./services/getRoleRequests.js";
import { createRoleRequests } from "./services/createRoleRequests.js";
import { reviewRoleRequest } from "./services/reviewRoleRequests.js";
import { getPendingRoleRequestCount } from "./services/getPendingRoleRequestCount.js";

export const RoleRequestsService = {
  getRoleRequests,
  createRoleRequests,
  reviewRoleRequest,
  getPendingRoleRequestCount,
};