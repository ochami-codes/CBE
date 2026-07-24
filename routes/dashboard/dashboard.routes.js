import express from "express";
import { DashboardController } from "./dashboard.controller.js";
import { authorize } from "../../middleware/authorize.js";
const router = express.Router();

router.get(
  "/daily/verse",
  DashboardController.getDailyVerse
);

router.post(
  "/daily/verse",
  authorize("manage_system"),
  DashboardController.createDailyVerse
);

router.get(
  "/birthdays/mine",
  DashboardController.getMyBirthday
);

router.get(
  "/birthdays/today",
  DashboardController.getTodaysBirthdays
);

router.get(
  "/birthdays/upcoming",
  DashboardController.getUpcomingBirthdays
);

export default router;