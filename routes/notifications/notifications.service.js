import { getNotifications } from "./services/getNotifications.js";
import { getUnreadCount } from "./services/getUnreadNotificationCount.js";
import { markNotificationAsRead } from "./services/markNotificationAsRead.js";
import { markAllNotificationsAsRead } from "./services/markAllNotificationRead.js";

export const NotificationService = {
getNotifications,
getUnreadCount,
markNotificationAsRead,
markAllNotificationsAsRead,
};