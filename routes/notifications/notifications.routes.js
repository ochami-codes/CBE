import express from "express";
import { NotificationController } from "./notifications.controller.js";

const router = express.Router();

router.get("/", NotificationController.getNotifications);
router.get("/unread-count",  NotificationController.getUnreadCount);
router.post("/read/:id", NotificationController.markNotificationAsRead);
router.patch("/read", NotificationController.markAllNotificationsAsRead);

export default router;