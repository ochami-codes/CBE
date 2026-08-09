import express from "express";
import { ReusableController } from "./reusables.controller.js";
import { authorize } from "../../middleware/authorize.js";
import { authorizeChurch } from "../../middleware/authorizeChurch.js";
const router = express.Router();

router.post(
"/church",
ReusableController.createChurch
);

router.post(
"/switch-church",
ReusableController.switchActiveChurch
);

router.get(
  "/church/:churchId",
  ReusableController.getChurch
);

router.get(
  "/churches",
  ReusableController.getChurches
);
router.get(
  "/conferences",
  ReusableController.getConferences
);
router.patch(
  "/conferences/:conferenceId",
  authorize("manage_system"),
  ReusableController.updateConference
);

router.get(
  "/roles",
  ReusableController.getFrontendRoles
);
router.post(
    "/departments",
    authorizeChurch,
    authorize("manage_departments"),
    ReusableController.createDepartment
)

router.get(
  "/departments",
  authorizeChurch,
  ReusableController.getDepartments
);
router.patch(
  "/departments/:departmentId/activate",
  authorizeChurch,
  authorize("manage_departments"),
  ReusableController.activateDepartment
);
router.patch(
  "/departments/:departmentId/deactivate",
  authorizeChurch,
  authorize("manage_departments"),
  ReusableController.deactivateDepartment
);

export default router;