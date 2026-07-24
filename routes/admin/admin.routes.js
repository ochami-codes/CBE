import express from "express";
import { AdminController } from "./admin.controller.js";
import { authorize } from "../../middleware/authorize.js";
const router = express.Router();

router.get(
  "/members",
  authorize("manage_members"),
  AdminController.getChurchMembers
);
router.put(
  "/roles/:memberId/update",
  authorize("manage_members"),
  AdminController.updateMemberRoles
);

router.post(
  "/members/:memberId",
  authorize("manage_members"),
  AdminController.updateMemberStatus
);

export default router;
