import express from "express";

import { AnnouncementController } from "./announcements.controller.js";

const router = express.Router();

router.get("/", AnnouncementController.getAnnouncements);

router.post("/",AnnouncementController.createAnnouncement);

router.delete("/:id", AnnouncementController.deleteAnnouncement);

export default router;