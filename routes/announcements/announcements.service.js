import { getChurchAnnouncements } from "./services/getChurchAnnouncements.js";
import { getMyDepartmentAnnouncements } from "./services/getMyDepartmentAnnouncements.js";
import { createChurchAnnouncement, createDepartmentAnnouncement } from "./services/createAnnouncement.js";
import { deleteChurchAnnouncement } from "./services/deleteChurchAnnouncement.js";
import { deleteDepartmentAnnouncement } from "./services/deleteDepartmentAnnouncement.js";
import { getDepartmentAnnouncements } from "./services/getChurchAnnouncements.js";

export const AnnouncementService = {
  getChurchAnnouncements,
  getDepartmentAnnouncements,
  getMyDepartmentAnnouncements,
  createChurchAnnouncement,
  createDepartmentAnnouncement,
  deleteChurchAnnouncement,
  deleteDepartmentAnnouncement,
};