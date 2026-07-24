import express from "express";
import { AnnouncementController } from "./announcements.controller.js";
import { authorize } from "../../middleware/authorize.js";
import { authorizeDepartment } from "../../middleware/authorizeDepartment.js";
const router = express.Router();

/*
|--------------------------------------------------------------------------
| Church Announcements
|--------------------------------------------------------------------------
*/

// Everyone can view
router.get(
  "/church",
  AnnouncementController.getChurchAnnouncements
);

// Communication leader only
router.post(
  "/church",
  authorize("manage_media"),
  AnnouncementController.createChurchAnnouncement
);

// Communication leader only
router.delete(
  "/church/:announcementId",
  authorize("manage_media"),
  AnnouncementController.deleteChurchAnnouncement
);

/*
|--------------------------------------------------------------------------
| Department Announcements
|--------------------------------------------------------------------------
*/

// Everyone can view department announcements
router.get(
  "/departments/mine",
  AnnouncementController.getMyDepartmentAnnouncements
);

// Department leader only
router.post(
  "/departments/:departmentId",
  authorizeDepartment("manage_dept_announcements"),
  AnnouncementController.createDepartmentAnnouncement
);

// Department leader only
router.delete(
  "/departments/:departmentId/:announcementId",
  authorizeDepartment("manage_dept_announcements"),
  AnnouncementController.deleteDepartmentAnnouncement);

export default router;