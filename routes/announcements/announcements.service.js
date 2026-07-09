import { getAnnouncements } from "./services/getAnnouncement.js";
import { createAnnouncement } from "./services/createAnnouncement.js";
import { deleteAnnouncement } from "./services/deleteAnnouncement.js";

export const AnnouncementService = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};