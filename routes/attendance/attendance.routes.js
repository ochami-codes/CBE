import express from "express";

import { AttendanceController } from "./attendance.controller.js";
const router = express.Router();

router.get("/", AttendanceController.getAttendance);

router.post("/", AttendanceController.saveAttendance);

export default router;