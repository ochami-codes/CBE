import { AnnouncementService } from "./announcements.service.js";
export const AnnouncementController = {
  async getChurchAnnouncements(
    req,
    res,
    next
  ) {
    try {
      const announcements =
        await AnnouncementService.getAnnouncements({
          churchId:
            req.user.active_church_id,
            limit: req.query.limit
        });

      res.json({
        announcements,
      });
    } catch (error) {
      next(error);
    }
  },
  async getDepartmentAnnouncements(
    req,
    res,
    next
  ) {
    try {
      const announcements =
        await AnnouncementService.getAnnouncements({
          churchId:
            req.user.active_church_id,
          departmentId:
            req.query.departmentId,
            limit: req.query.limit,
        });

      res.json({
        announcements,
      });
    } catch (error) {
      next(error);
    }
  },

  async createAnnouncement(
    req,
    res,
    next
  ) {
    try {
      const announcement =
        await AnnouncementService.createAnnouncement({
          churchId:
            req.user.active_church_id,
          user: req.user,
          payload: req.body,
        });

      res.status(201).json(
        announcement
      );
    } catch (error) {
      next(error);
    }
  },

  async deleteAnnouncement(
    req,
    res,
    next
  ) {
    try {
      await AnnouncementService.deleteAnnouncement({
        churchId:
          req.user.active_church_id,
        announcementId:
          req.params.id,
      });

      res.json({
        message:
          "Announcement deleted.",
      });
    } catch (error) {
      next(error);
    }
  },
};