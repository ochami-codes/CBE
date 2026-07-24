import { DashboardService } from "./dashboard.service.js";
import {
  createHandler,
  getHandler,
} from "../../utils/controller.js";

export const DashboardController = {
  getDailyVerse: getHandler(async () => 
     await DashboardService.getDailyVerse(),
  ),

  createDailyVerse: createHandler(async (req) => ({
    verse: await DashboardService.createDailyVerse(req.body),
  })),

  getMyBirthday: getHandler(async (req) =>
    DashboardService.getMyBirthday({
      profileId: req.user.id,
    })
  ),

  getTodaysBirthdays: getHandler(async (req) =>
    DashboardService.getTodaysBirthdays({
      churchId: req.user.active_church_id,
    })
  ),

  getUpcomingBirthdays: getHandler(async (req) =>
    DashboardService.getUpcomingBirthdays({
      churchId: req.user.active_church_id,
      daysAhead: Number(req.query.days) || 7,
    })
  ),
};