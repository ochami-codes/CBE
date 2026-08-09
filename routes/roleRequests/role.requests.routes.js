import express from "express";
import { RoleRequestsController } from "./role.requests.controller.js";
import { authorize } from "../../middleware/authorize.js";

const router = express.Router();

router.get(
  "/",
  authorize("manage_requests"),
  RoleRequestsController.getRoleRequests
);

router.get(
  "/mine",
  RoleRequestsController.getMyRequest
);

router.post(
  "/",
  RoleRequestsController.createRoleRequest
);

router.get(
  "/pending/count",
  authorize("manage_requests"),
  RoleRequestsController.getPendingCount
);

router.post(
  "/:requestId/review",
  authorize("manage_requests"),
  RoleRequestsController.reviewRoleRequest
);

export default router;