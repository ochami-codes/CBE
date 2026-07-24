import { MembershipService } from "./membership.service.js";
import { 
  createHandler,
  getHandler,
  updateHandler,
} from "../../utils/controller.js";

export const MembershipController = {
  getMembershipRequests: getHandler(async (req) => ({
    requests:
      await MembershipService.getMembershipRequests({
        churchId: req.user.active_church_id,
      }),
  })),
   getMyMembershipRequest: getHandler(async (req) => ({
    requests:
      await MembershipService.getMyMembershipRequest({
        profileId: req.user.id,
      }),
  })),

  createMembershipRequest: createHandler(async (req) =>
    MembershipService.createMembershipRequest({
      churchId: req.user.active_church_id,
      profileId: req.user.id,
    })
  ),
  reviewMembershipRequest: createHandler(async (req) =>
    MembershipService.reviewMembershipRequest({
      churchId: req.user.active_church_id,  
      requestId: req.params.requestId,
      reviewedBy: req.user.id,
      action: req.body.action,
    })
  ),
};