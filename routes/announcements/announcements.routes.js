import express from "express";

import { AnnouncementController } from "./announcements.controller.js";

const router = express.Router();

// Church-wide announcements (visible to everyone)
router.get(
  "/church",
  AnnouncementController.getChurchAnnouncements
);

// Department announcements
router.get(
  "/department/:departmentId",
  AnnouncementController.getDepartmentAnnouncements
);

router.post(
  "/",
  AnnouncementController.createAnnouncement
);

router.delete(
  "/:id",
  AnnouncementController.deleteAnnouncement
);

export default router;