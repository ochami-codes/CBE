import { Router } from "express";

import {
  getLessonGuides,
  createLessonGuide,
  createMyLessonGuide,
  updateLessonGuide,
  deleteLessonGuide,
  createAttendance,
  getAttendance,
  createOfferings,
  getOfferings,
} from "./sabbathSchool.controller.js";

const router = Router();

// Lesson Guides
router.get("/lesson-guides", getLessonGuides);

// Member self-subscription
router.post("/lesson-guides/me", createMyLessonGuide);

// Sabbath School leader/manual registration
router.post("/lesson-guides", createLessonGuide);

router.put("/lesson-guides/:id", updateLessonGuide);
router.delete("/lesson-guides/:id", deleteLessonGuide);

// Attendance
router.post("/:departmentId/attendance", createAttendance);
router.get("/:departmentId/attendance", getAttendance);

// Offerings
router.post("/finances", createOfferings);
router.get("/:departmentId/finances", getOfferings);

export default router;