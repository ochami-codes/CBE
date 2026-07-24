import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
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
router.get("/lesson-guides", authorize("manage_s_school"), getLessonGuides);

// Member self-subscription
router.post("/lesson-guides/me", createMyLessonGuide);

// Sabbath School leader/manual registration
router.post("/lesson-guides", authorize("manage_s_school"), createLessonGuide);

router.put("/lesson-guides/:id", authorize("manage_s_school"), updateLessonGuide);
router.delete("/lesson-guides/:id",authorize("manage_s_school"), deleteLessonGuide);

// Attendance
router.post("/:departmentId/attendance",authorize("manage_s_school"), createAttendance);
router.get("/:departmentId/attendance",authorize("manage_s_school"), getAttendance);

// Offerings
router.post("/finances",authorize("manage_s_school"), createOfferings);
router.get("/:departmentId/finances",authorize("manage_s_school"), getOfferings);

export default router;