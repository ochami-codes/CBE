import { getDailyVerse} from "./services/getDailyVerse.js";
import { createDailyVerse } from "./services/createDailyVerse.js";
import { getMyBirthday } from "./services/getMyBirthday.js";
import { getTodaysBirthdays } from "./services/getTodaysBirthdays.js";
import { getUpcomingBirthdays } from "./services/getUpcomingBirthdays.js";

export const DashboardService = {
  getDailyVerse,
  createDailyVerse,
  getMyBirthday,
  getTodaysBirthdays,
  getUpcomingBirthdays,
};