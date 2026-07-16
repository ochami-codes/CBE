import { getLessonGuides } from "./services/getLessonGuides.js";
import { createLessonGuide } from "./services/createLessonGuide.js";
import { updateLessonGuide } from "./services/updateLessonGuide.js";
import { deleteLessonGuide } from "./services/deleteLessonGuide.js";
import { getAttendance } from "./services/getAttendance.js";
import { createAttendance } from "./services/createAttendance.js";
import { createOfferings } from "./services/createOfferings.js";
import { getOfferings } from "./services/getOfferings.js";
export const SabbathSchoolService = {
  getLessonGuides,
  createLessonGuide,
  updateLessonGuide,
  deleteLessonGuide,
  getAttendance,
  createAttendance,
  createOfferings,
  getOfferings,
};