import { AdminService } from "./admin.service.js";
import { 
  getHandler,
  updateHandler,
} from "../../utils/controller.js";

export const AdminController = {
  getChurchMembers: getHandler(async (req) => ({
    members:
      await AdminService.getChurchMembers({
        churchId: req.user.active_church_id,
      }),
  })),
  updateMemberRoles: updateHandler(async (req) => ({
    announcements:
      await AdminService.updateMemberRoles({
        churchId: req.user.active_church_id,
        memberId: req.params.memberId,
        roles: req.body.roles,
        actorMemberId: req.user.active_member_id,

      }),
  })),

  updateMemberStatus: updateHandler(async (req) =>
    AdminService.updateMemberStatus({
      churchId: req.user.active_church_id,
      performedBy: req.user.active_member_id,
      memberId: req.params.memberId,
      action: req.query.action,
      reason: req.body.reason,
    })
  ),
};