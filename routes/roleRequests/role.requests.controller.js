import { RoleRequestsService } from "./role.requests.service.js";
import { 
  createHandler,
  getHandler,
  updateHandler,
} from "../../utils/controller.js";

export const RoleRequestsController = {
  getRoleRequests: getHandler(
    async (req) =>
      await RoleRequestsService.getRoleRequests({
        churchId: req.user.active_church_id,
      })
  ),
  getMyRequest: getHandler(
    async (req) => 
      await RoleRequestsService.getRoleRequests({
        churchId: req.user.active_church_id,
        memberId: req.user.active_member_id,
      })
  ),

  createRoleRequest: createHandler(async (req) =>
    RoleRequestsService.createRoleRequests({
      churchId: req.user.active_church_id,
      memberId: req.user.active_member_id,
      requestedRole: req.body.requested_role,
    })
  ),
  getPendingCount: getHandler(async (req) =>
    RoleRequestsService.getPendingRoleRequestCount({
      churchId: req.user.active_church_id,
    })
  ),
  reviewRoleRequest: createHandler(async (req) =>
    RoleRequestsService.reviewRoleRequest({
      requestId: req.params.requestId,
      reviewerProfileId: req.user.id,
      action: req.body.action,
    })
  ),
};