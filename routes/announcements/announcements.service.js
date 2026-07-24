import { getChurchAnnouncements } from "./services/getChurchAnnouncements.js";
import { getMyDepartmentAnnouncements } from "./services/getMyDepartmentAnnouncements.js";
import { createAnnouncement } from "./services/createAnnouncement.js";
import { deleteChurchAnnouncement } from "./services/deleteChurchAnnouncement.js";
import { deleteDepartmentAnnouncement } from "./services/deleteDepartmentAnnouncement.js";

export const AnnouncementService = {
  getChurchAnnouncements,
  getMyDepartmentAnnouncements,
  createAnnouncement,
  deleteChurchAnnouncement,
  deleteDepartmentAnnouncement,
};