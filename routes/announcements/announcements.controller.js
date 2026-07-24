import { AnnouncementService } from "./announcements.service.js";
import { 
  createHandler,
  getHandler,
  deleteHandler,
} from "../../utils/controller.js";

export const AnnouncementController = {
  getChurchAnnouncements: getHandler(async (req) => ({
    announcements:
      await AnnouncementService.getChurchAnnouncements({
        churchId: req.user.active_church_id,
        limit: req.query.limit,
      }),
  })),
  getMyDepartmentAnnouncements: getHandler(async (req) => ({
    announcements:
      await AnnouncementService.getMyDepartmentAnnouncements({
        profileId: req.user.id,
        churchId: req.user.active_church_id,
        limit: req.query.limit,

      }),
  })),

  createChurchAnnouncement: createHandler(async (req) =>
    AnnouncementService.createAnnouncement({
      churchId: req.user.active_church_id,
      createdBy: req.user.id,
      payload: req.body,
    })
  ),
  createDepartmentAnnouncement: createHandler(async (req) =>
    AnnouncementService.createAnnouncement({
      churchId: req.user.active_church_id,
      departmentId: req.user.params,
      createdBy: req.user.id,
      payload: req.body,
    })
  ),

  deleteChurchAnnouncement: deleteHandler(
    "Announcement deleted."
  )(async (req) =>
    AnnouncementService.deleteAnnouncement({
      churchId: req.user.active_church_id,
      announcementId: req.params.announcementId,
    })
  ),
  deleteChurchAnnouncement: deleteHandler(
    "Announcement deleted."
  )(async (req) =>
    AnnouncementService.deleteChurchAnnouncement({
      churchId: req.user.active_church_id,
      announcementId: req.params.announcementId,
    })
  ),
  deleteDepartmentAnnouncement: deleteHandler(
    "Announcement deleted."
  )(async (req) =>
    AnnouncementService.deleteDepartmentAnnouncement({
      churchId: req.user.active_church_id,
      departmentId: req.params.departmentId,
      announcementId: req.params.announcementId,
    })
  ),
};