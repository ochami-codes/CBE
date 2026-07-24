// controllers/notifications/notifications.controller.js

import { NotificationService } from "./notifications.service.js";
import {
  getHandler,
  updateHandler,
} from "../../utils/controller.js";

export const NotificationController = {
  getNotifications: getHandler(async (req) =>
    NotificationService.getNotifications({
      profileId: req.user.id,
      churchId: req.user.active_church_id,
      page: req.query.page,
      limit: req.query.limit,
    })
  ),

  getUnreadCount: getHandler(async (req) =>
    NotificationService.getUnreadCount({
      profileId: req.user.id,
      churchId: req.user.active_church_id,
    })
  ),

  markNotificationAsRead: updateHandler(async (req) =>
    NotificationService.markNotificationAsRead({
      notificationId: req.params.id,
      profileId: req.user.id,
      churchId: req.user.active_church_id,
    })
  ),

  markAllNotificationsAsRead: updateHandler(async (req) =>
    NotificationService.markAllNotificationsAsRead({
      profileId: req.user.id,
      churchId: req.user.active_church_id,
    })
  ),
};