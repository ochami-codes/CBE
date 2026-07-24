import express from "express";
import { MembershipController } from "./membership.controller.js";
import { authorize } from "../../middleware/authorize.js";
const router = express.Router();

router.get(
  "/",
  authorize("manage_requests"),
  MembershipController.getMembershipRequests
);

router.post(
  "/",
  MembershipController.createMembershipRequest
);

router.get(
  "/me",
  MembershipController.getMyMembershipRequest
);

router.post(
  "/:requestId/review",
  authorize("manage_requests"),
  MembershipController.reviewMembershipRequest
);

export default router;