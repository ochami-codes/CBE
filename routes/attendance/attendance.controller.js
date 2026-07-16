import { AttendanceService } from "./attendance.service.js";

export const AttendanceController = {
  async getAttendance(
    req,
    res,
    next
  ) {
    try {
      const attendance =
        await AttendanceService.getAttendance({
          churchId:
            req.user.active_church_id,
          query:
            req.query,
        });

      res.json(attendance);
    } catch (error) {
      next(error);
    }
  },

  async saveAttendance(
    req,
    res,
    next
  ) {
    try {
      const attendance =
        await AttendanceService.saveAttendance({
          churchId:
            req.user.active_church_id,
          userId:
            req.user.id,
          body:
            req.body,
        });

      res.status(201).json(
        attendance
      );
    } catch (error) {
      next(error);
    }
  },
};